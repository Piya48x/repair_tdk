import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCheck,
  Circle,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Paperclip,
  Pencil,
  UserPlus,
  Users,
  Search,
  Send,
  Smile,
  Trash2,
  X,
} from "lucide-react";
import { useScopedI18n } from "../i18n/useScopedI18n";
import { supabase } from "../lib/supabaseClient";

const MESSAGE_LIMIT = 200;
const PRESENCE_INTERVAL_MS = 30000;
const DIRECTORY_RESYNC_INTERVAL_MS = 5 * 60 * 1000;
const PRESENCE_ONLINE_WINDOW_MS = 90 * 1000;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const SUPPORT_ROLES = new Set(["it_support", "it_manager", "admin"]);
const GROUP_MANAGER_ROLES = new Set(["it_manager", "admin"]);
const CHAT_LOCALE = { th: "th-TH", en: "en-US", ko: "ko-KR" };
const STICKER_TOKEN_PATTERN = /\[\[sticker:([a-z0-9_-]+)\]\]/i;
const CHAT_STICKERS = [
  { id: "thumbs-up", emoji: "\u{1F44D}", label: "Like" },
  { id: "party", emoji: "\u{1F389}", label: "Party" },
  { id: "love", emoji: "\u{1F60D}", label: "Love" },
  { id: "fire", emoji: "\u{1F525}", label: "Fire" },
  { id: "ok", emoji: "\u{1F44C}", label: "OK" },
  { id: "thanks", emoji: "\u{1F64F}", label: "Thanks" },
  { id: "wow", emoji: "\u{1F929}", label: "Wow" },
  { id: "rocket", emoji: "\u{1F680}", label: "Go" },
];
const CHAT_STICKER_MAP = new Map(CHAT_STICKERS.map((sticker) => [sticker.id, sticker]));

const CENTRAL_CHAT_DOCK_TRANSLATIONS = {
  th: {
    roles: {
      itSupport: "IT",
      itManager: "ผู้จัดการ IT",
      admin: "ผู้ดูแลระบบ",
      executive: "ผู้บริหาร",
      auditor: "ผู้ตรวจสอบ",
      group: "กลุ่ม",
      user: "ผู้ใช้",
    },
    stickers: {
      "thumbs-up": "ถูกใจ",
      party: "ฉลอง",
      love: "รักเลย",
      fire: "สุดยอด",
      ok: "โอเค",
      thanks: "ขอบคุณ",
      wow: "ว้าว",
      rocket: "ลุย",
    },
    centralChat: "แชทกลาง",
    centralMessage: "ข้อความรวม",
    groupChat: "แชทกลุ่ม",
    chooseConversation: "เลือกห้องสนทนา",
    unreadMessages: "ยังไม่อ่าน {{count}} ข้อความ",
    allChatsHint: "รวมแชทส่วนตัวและแชทกลุ่มในที่เดียว",
    openChat: "เปิดแชท",
    dragToMove: "ลากเพื่อย้ายหน้าต่างแชท",
    expandWindow: "ขยายหน้าต่างแชท",
    collapseWindow: "ย่อหน้าต่างแชท",
    closeWindow: "ปิดหน้าต่างแชท",
    search: "ค้นหา",
    createGroup: "สร้างกลุ่มแชท",
    loadingMembers: "กำลังโหลดรายชื่อ...",
    groups: "กลุ่ม",
    noGroups: "ยังไม่มีกลุ่มแชท",
    people: "บุคคล",
    noUsers: "ไม่พบผู้ใช้",
    backToChatList: "ย้อนกลับไปหน้ารายการแชท",
    online: "ออนไลน์",
    offline: "ออฟไลน์",
    editGroup: "แก้ไขกลุ่ม",
    selectConversationTitle: "เลือกห้องสนทนา",
    selectConversationSubtitle: "เลือกบุคคลหรือกลุ่มจากแถบด้านซ้าย",
    loadingMessages: "กำลังโหลดข้อความ...",
    emptyConversationTitle: "เลือกห้องสนทนา",
    emptyConversationSubtitle: "รองรับข้อความ รูปภาพ และไฟล์",
    noMessages: "ยังไม่มีข้อความ",
    startConversationWith: "เริ่มสนทนากับ {{name}}",
    you: "คุณ",
    member: "สมาชิก",
    attachedFile: "ไฟล์แนบ",
    typing: "{{name}} กำลังพิมพ์...",
    dropToAttach: "ปล่อยไฟล์เพื่อแนบ",
    supportedAttachments: "รองรับรูปภาพ PDF Excel และเอกสาร",
    removeAttachment: "ลบไฟล์แนบ",
    attachFile: "แนบไฟล์",
    openCamera: "เปิดกล้อง",
    openStickers: "เปิดสติกเกอร์",
    stickersTitle: "สติกเกอร์",
    composerPlaceholder: "พิมพ์ข้อความถึง {{name}}",
    chooseRoomFirst: "กรุณาเลือกห้องสนทนาก่อน",
    sendMessage: "ส่งข้อความ",
    newGroup: "กลุ่มใหม่",
    createGroupTitle: "สร้างกลุ่มแชท",
    closeCreateGroup: "ปิดหน้าต่างสร้างกลุ่ม",
    groupNameOptional: "ชื่อกลุ่ม (ไม่บังคับ)",
    groupNameExample: "ตัวอย่าง: ทีม Operations",
    members: "สมาชิก",
    noMembersToSelect: "ยังไม่มีสมาชิกให้เลือก",
    selectedMembers: "เลือกแล้ว {{count}} สมาชิก (รวมคุณ)",
    create: "สร้าง",
    collapsed: "ย่อหน้าต่าง",
    tapToExpand: "แตะเพื่อขยายแชท",
    memberCount: "{{count}} สมาชิก",
    startChat: "เริ่มแชทได้เลย",
    youPrefix: "คุณ: ",
    sentImage: "ส่งรูปภาพ",
    sentFile: "ส่งไฟล์",
    newMessage: "ข้อความใหม่",
    stickerWithCaption: "สติกเกอร์: {{caption}}",
    sentSticker: "ส่งสติกเกอร์",
    missingSchemaNotice: "ยังไม่ได้ติดตั้ง schema ของ Messenger บน Supabase",
    permissionDeniedNotice: "ไม่มีสิทธิ์ใช้งานแชท กรุณารัน SQL migration และเข้าสู่ระบบใหม่",
    loadUsersFailed: "โหลดรายชื่อผู้ใช้ไม่สำเร็จ",
    loadRoomsFailed: "โหลดรายการสนทนาไม่สำเร็จ",
    loadMessagesFailed: "โหลดข้อความไม่สำเร็จ",
    createRoomFailed: "สร้างห้องแชทไม่สำเร็จ",
    groupPhotoTooLarge: "รูปโปรไฟล์กลุ่มต้องมีขนาดไม่เกิน 20 MB",
    groupPhotoImageOnly: "รูปโปรไฟล์กลุ่มต้องเป็นไฟล์รูปภาพ",
    selectAtLeastOneMember: "กรุณาเลือกสมาชิกอย่างน้อย 1 คนก่อนสร้างกลุ่ม",
    createGroupPermissionDenied: "ไม่มีสิทธิ์สร้างกลุ่มแชท กรุณารัน SQL migration และเข้าสู่ระบบใหม่",
    legacyUniqueKey: "ยังมี unique key เก่าบน chat_rooms กรุณารันไฟล์ SQL migration ใหม่ทั้งไฟล์",
    legacySequencePermission: "ยังไม่มีสิทธิ์ sequence บน chat_rooms_id_seq กรุณารัน SQL migration ใหม่ทั้งไฟล์",
    legacyDirectConstraint: "chat_rooms ยังติด check constraint แบบ direct อยู่ กรุณารัน 20260323_chat_group_messenger.sql ใหม่ทั้งไฟล์",
    createGroupFailed: "สร้างกลุ่มแชทไม่สำเร็จ",
    migrationNotice: "กรุณารัน Messenger SQL migration เวอร์ชันล่าสุดบน Supabase",
    editGroupDenied: "คุณไม่มีสิทธิ์แก้ไขกลุ่มนี้",
    updateGroupFailed: "อัปเดตกลุ่มไม่สำเร็จ",
    confirmDeleteGroup: "ลบกลุ่มแชทนี้หรือไม่?",
    deleteGroupDidNotComplete: "การลบกลุ่มไม่สมบูรณ์",
    deleteGroupDenied: "คุณไม่มีสิทธิ์ลบกลุ่มนี้",
    deleteGroupFailed: "ลบกลุ่มไม่สำเร็จ",
    attachmentTooLarge: "ไฟล์ต้องมีขนาดไม่เกิน 20 MB",
    groupRoomMissing: "ไม่สามารถระบุห้องแชทกลุ่มได้",
    sendPermissionDenied: "ไม่มีสิทธิ์ส่งข้อความ กรุณารัน SQL migration และเข้าสู่ระบบใหม่",
    sendFailed: "ส่งข้อความไม่สำเร็จ",
    sendStickerDenied: "ไม่มีสิทธิ์ส่งสติกเกอร์ กรุณารัน SQL migration และเข้าสู่ระบบใหม่",
    sendStickerFailed: "ส่งสติกเกอร์ไม่สำเร็จ",
    groupSettings: "การตั้งค่ากลุ่ม",
    manageGroup: "จัดการกลุ่ม",
    closeGroupSettings: "ปิดหน้าต่างตั้งค่ากลุ่ม",
    groupPhoto: "รูปกลุ่ม",
    removePhoto: "ลบรูป",
    groupName: "ชื่อกลุ่ม",
    groupNamePlaceholder: "ทีม Operations",
    groupManagementHint: "การจัดการกลุ่มใช้ได้สำหรับ Admin, IT Manager และเจ้าของห้อง",
    deleteGroup: "ลบกลุ่ม",
    saveChanges: "บันทึกการเปลี่ยนแปลง",
  },
  en: {
    roles: {
      itSupport: "IT",
      itManager: "IT Manager",
      admin: "Administrator",
      executive: "Executive",
      auditor: "Auditor",
      group: "Group",
      user: "User",
    },
    stickers: {
      "thumbs-up": "Like",
      party: "Party",
      love: "Love",
      fire: "Fire",
      ok: "OK",
      thanks: "Thanks",
      wow: "Wow",
      rocket: "Go",
    },
    centralChat: "Central chat",
    centralMessage: "Central message",
    groupChat: "Group chat",
    chooseConversation: "Choose a conversation",
    unreadMessages: "{{count}} unread messages",
    allChatsHint: "Keep direct chats and group chats in one place",
    openChat: "Open chat",
    dragToMove: "Drag to move the chat window",
    expandWindow: "Expand chat window",
    collapseWindow: "Collapse chat window",
    closeWindow: "Close chat window",
    search: "Search",
    createGroup: "Create group chat",
    loadingMembers: "Loading people...",
    groups: "Groups",
    noGroups: "No group chats yet",
    people: "People",
    noUsers: "No users found",
    backToChatList: "Back to chat list",
    online: "Online",
    offline: "Offline",
    editGroup: "Edit group",
    selectConversationTitle: "Choose a conversation",
    selectConversationSubtitle: "Pick a person or group from the left side",
    loadingMessages: "Loading messages...",
    emptyConversationTitle: "Choose a conversation",
    emptyConversationSubtitle: "Supports messages, images, and files",
    noMessages: "No messages yet",
    startConversationWith: "Start a conversation with {{name}}",
    you: "You",
    member: "Member",
    attachedFile: "Attachment",
    typing: "{{name}} is typing...",
    dropToAttach: "Drop a file to attach",
    supportedAttachments: "Supports images, PDF, Excel, and documents",
    removeAttachment: "Remove attachment",
    attachFile: "Attach file",
    openCamera: "Open camera",
    openStickers: "Open stickers",
    stickersTitle: "Stickers",
    composerPlaceholder: "Type a message to {{name}}",
    chooseRoomFirst: "Select a conversation first",
    sendMessage: "Send message",
    newGroup: "New group",
    createGroupTitle: "Create group chat",
    closeCreateGroup: "Close create group dialog",
    groupNameOptional: "Group name (optional)",
    groupNameExample: "Example: Operations Team",
    members: "Members",
    noMembersToSelect: "No members available to select",
    selectedMembers: "{{count}} members selected (including you)",
    create: "Create",
    collapsed: "Collapsed",
    tapToExpand: "Tap to expand chat",
    memberCount: "{{count}} members",
    startChat: "Start chatting",
    youPrefix: "You: ",
    sentImage: "Sent an image",
    sentFile: "Sent a file",
    newMessage: "New message",
    stickerWithCaption: "Sticker: {{caption}}",
    sentSticker: "Sent a sticker",
    missingSchemaNotice: "Messenger schema has not been installed on Supabase yet.",
    permissionDeniedNotice: "You do not have permission to use chat. Run the SQL migration and sign in again.",
    loadUsersFailed: "Unable to load the user directory.",
    loadRoomsFailed: "Unable to load conversations.",
    loadMessagesFailed: "Unable to load messages.",
    createRoomFailed: "Unable to create the chat room.",
    groupPhotoTooLarge: "Group profile images must be 20 MB or smaller.",
    groupPhotoImageOnly: "Group profile images must be image files.",
    selectAtLeastOneMember: "Select at least one member before creating a group.",
    createGroupPermissionDenied: "You do not have permission to create group chats. Run the SQL migration and sign in again.",
    legacyUniqueKey: "A legacy unique key still exists on chat_rooms. Re-run the full SQL migration.",
    legacySequencePermission: "Missing sequence permission on chat_rooms_id_seq. Re-run the full SQL migration.",
    legacyDirectConstraint: "chat_rooms still has the legacy direct check constraint. Re-run 20260323_chat_group_messenger.sql fully.",
    createGroupFailed: "Unable to create the group chat.",
    migrationNotice: "Run the latest Messenger SQL migration on Supabase.",
    editGroupDenied: "You do not have permission to edit this group.",
    updateGroupFailed: "Unable to update the group.",
    confirmDeleteGroup: "Delete this group chat?",
    deleteGroupDidNotComplete: "Group deletion did not complete.",
    deleteGroupDenied: "You do not have permission to delete this group.",
    deleteGroupFailed: "Unable to delete the group.",
    attachmentTooLarge: "Files must be 20 MB or smaller.",
    groupRoomMissing: "Unable to determine the group chat room.",
    sendPermissionDenied: "You do not have permission to send messages. Run the SQL migration and sign in again.",
    sendFailed: "Unable to send the message.",
    sendStickerDenied: "You do not have permission to send stickers. Run the SQL migration and sign in again.",
    sendStickerFailed: "Unable to send the sticker.",
    groupSettings: "Group settings",
    manageGroup: "Manage group",
    closeGroupSettings: "Close group settings",
    groupPhoto: "Group photo",
    removePhoto: "Remove photo",
    groupName: "Group name",
    groupNamePlaceholder: "Operations Team",
    groupManagementHint: "Group management is available for Admin, IT Manager, and the room owner.",
    deleteGroup: "Delete group",
    saveChanges: "Save changes",
  },
  ko: {
    roles: {
      itSupport: "IT",
      itManager: "IT 관리자",
      admin: "관리자",
      executive: "임원",
      auditor: "감사 담당",
      group: "그룹",
      user: "사용자",
    },
    stickers: {
      "thumbs-up": "좋아요",
      party: "축하",
      love: "사랑해요",
      fire: "최고예요",
      ok: "확인",
      thanks: "감사해요",
      wow: "와우",
      rocket: "출발",
    },
    centralChat: "중앙 채팅",
    centralMessage: "중앙 메시지",
    groupChat: "그룹 채팅",
    chooseConversation: "대화를 선택하세요",
    unreadMessages: "읽지 않은 메시지 {{count}}개",
    allChatsHint: "개인 채팅과 그룹 채팅을 한곳에서 관리합니다",
    openChat: "채팅 열기",
    dragToMove: "드래그하여 채팅 창 이동",
    expandWindow: "채팅 창 펼치기",
    collapseWindow: "채팅 창 접기",
    closeWindow: "채팅 창 닫기",
    search: "검색",
    createGroup: "그룹 채팅 만들기",
    loadingMembers: "사용자 목록 불러오는 중...",
    groups: "그룹",
    noGroups: "그룹 채팅이 없습니다",
    people: "사용자",
    noUsers: "사용자를 찾을 수 없습니다",
    backToChatList: "채팅 목록으로 돌아가기",
    online: "온라인",
    offline: "오프라인",
    editGroup: "그룹 수정",
    selectConversationTitle: "대화를 선택하세요",
    selectConversationSubtitle: "왼쪽 목록에서 사용자나 그룹을 선택하세요",
    loadingMessages: "메시지 불러오는 중...",
    emptyConversationTitle: "대화를 선택하세요",
    emptyConversationSubtitle: "메시지, 이미지, 파일을 지원합니다",
    noMessages: "메시지가 아직 없습니다",
    startConversationWith: "{{name}}님과 대화를 시작하세요",
    you: "나",
    member: "멤버",
    attachedFile: "첨부 파일",
    typing: "{{name}}님이 입력 중...",
    dropToAttach: "파일을 놓아 첨부하세요",
    supportedAttachments: "이미지, PDF, Excel, 문서를 지원합니다",
    removeAttachment: "첨부 제거",
    attachFile: "파일 첨부",
    openCamera: "카메라 열기",
    openStickers: "스티커 열기",
    stickersTitle: "스티커",
    composerPlaceholder: "{{name}}님에게 메시지 입력",
    chooseRoomFirst: "먼저 대화를 선택하세요",
    sendMessage: "메시지 보내기",
    newGroup: "새 그룹",
    createGroupTitle: "그룹 채팅 만들기",
    closeCreateGroup: "그룹 생성 창 닫기",
    groupNameOptional: "그룹 이름(선택)",
    groupNameExample: "예: Operations 팀",
    members: "멤버",
    noMembersToSelect: "선택할 수 있는 멤버가 없습니다",
    selectedMembers: "{{count}}명 선택됨(본인 포함)",
    create: "만들기",
    collapsed: "접힘",
    tapToExpand: "탭하여 채팅 펼치기",
    memberCount: "{{count}}명",
    startChat: "채팅을 시작하세요",
    youPrefix: "나: ",
    sentImage: "이미지를 보냈습니다",
    sentFile: "파일을 보냈습니다",
    newMessage: "새 메시지",
    stickerWithCaption: "스티커: {{caption}}",
    sentSticker: "스티커를 보냈습니다",
    missingSchemaNotice: "Supabase에 Messenger 스키마가 아직 설치되지 않았습니다.",
    permissionDeniedNotice: "채팅을 사용할 권한이 없습니다. SQL migration을 실행하고 다시 로그인하세요.",
    loadUsersFailed: "사용자 목록을 불러올 수 없습니다.",
    loadRoomsFailed: "대화 목록을 불러올 수 없습니다.",
    loadMessagesFailed: "메시지를 불러올 수 없습니다.",
    createRoomFailed: "채팅방을 만들 수 없습니다.",
    groupPhotoTooLarge: "그룹 프로필 이미지는 20MB 이하여야 합니다.",
    groupPhotoImageOnly: "그룹 프로필 이미지는 이미지 파일만 가능합니다.",
    selectAtLeastOneMember: "그룹을 만들기 전에 최소 1명의 멤버를 선택하세요.",
    createGroupPermissionDenied: "그룹 채팅을 만들 권한이 없습니다. SQL migration을 실행하고 다시 로그인하세요.",
    legacyUniqueKey: "chat_rooms에 이전 unique key가 남아 있습니다. 전체 SQL migration을 다시 실행하세요.",
    legacySequencePermission: "chat_rooms_id_seq에 대한 sequence 권한이 없습니다. 전체 SQL migration을 다시 실행하세요.",
    legacyDirectConstraint: "chat_rooms에 이전 direct check constraint가 남아 있습니다. 20260323_chat_group_messenger.sql 전체를 다시 실행하세요.",
    createGroupFailed: "그룹 채팅을 만들 수 없습니다.",
    migrationNotice: "Supabase에 최신 Messenger SQL migration을 실행하세요.",
    editGroupDenied: "이 그룹을 수정할 권한이 없습니다.",
    updateGroupFailed: "그룹을 업데이트할 수 없습니다.",
    confirmDeleteGroup: "이 그룹 채팅을 삭제할까요?",
    deleteGroupDidNotComplete: "그룹 삭제가 완료되지 않았습니다.",
    deleteGroupDenied: "이 그룹을 삭제할 권한이 없습니다.",
    deleteGroupFailed: "그룹을 삭제할 수 없습니다.",
    attachmentTooLarge: "파일 크기는 20MB 이하여야 합니다.",
    groupRoomMissing: "그룹 채팅방을 확인할 수 없습니다.",
    sendPermissionDenied: "메시지를 보낼 권한이 없습니다. SQL migration을 실행하고 다시 로그인하세요.",
    sendFailed: "메시지를 보낼 수 없습니다.",
    sendStickerDenied: "스티커를 보낼 권한이 없습니다. SQL migration을 실행하고 다시 로그인하세요.",
    sendStickerFailed: "스티커를 보낼 수 없습니다.",
    groupSettings: "그룹 설정",
    manageGroup: "그룹 관리",
    closeGroupSettings: "그룹 설정 닫기",
    groupPhoto: "그룹 사진",
    removePhoto: "사진 제거",
    groupName: "그룹 이름",
    groupNamePlaceholder: "Operations 팀",
    groupManagementHint: "그룹 관리는 관리자, IT 관리자, 방 소유자만 사용할 수 있습니다.",
    deleteGroup: "그룹 삭제",
    saveChanges: "변경 사항 저장",
  },
};

function normalizeText(value) {
  return String(value || "").trim();
}

function formatDateTime(value, locale = "en-US") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeClock(value, locale = "en-US") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function buildStickerToken(stickerId) {
  return `[[sticker:${String(stickerId || "").trim()}]]`;
}

function parseStickerMessage(message) {
  const normalizedMessage = String(message || "");
  const match = normalizedMessage.match(STICKER_TOKEN_PATTERN);
  if (!match) return null;

  const sticker = CHAT_STICKER_MAP.get(String(match[1] || "").trim());
  if (!sticker) return null;

  const caption = normalizedMessage.replace(match[0], "").trim();
  return {
    sticker,
    caption,
    token: match[0],
  };
}

function buildAvatarFallback(name, color = "2b59b0") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name || "U"))}&background=${color}&color=fff&size=96`;
}

function toAvatarUrl(avatarUrl, displayName, tone = "2b59b0") {
  return avatarUrl || buildAvatarFallback(displayName, tone);
}

function roleLabel(role, labels = {}) {
  const normalized = normalizeText(role).toLowerCase();
  if (normalized === "it_support") return labels.itSupport || "IT";
  if (normalized === "it_manager") return labels.itManager || "IT Manager";
  if (normalized === "admin") return labels.admin || "Administrator";
  if (normalized === "executive") return labels.executive || "Executive";
  if (normalized === "auditor") return labels.auditor || "Auditor";
  if (normalized === "group") return labels.group || "Group";
  return labels.user || "User";
}

function previewForSummary(summary, currentUserId, labels = {}) {
  if (!summary?.last_message_id) return labels.startChat || "Start chatting";
  const prefix = String(summary?.last_message_sender_id || "") === currentUserId ? labels.youPrefix || "You: " : "";
  if (summary?.last_message_type === "image") return `${prefix}${labels.sentImage || "Sent an image"}`;
  if (summary?.last_message_type === "file") {
    return `${prefix}${summary?.last_message_file_name || labels.sentFile || "Sent a file"}`;
  }
  return `${prefix}${summary?.last_message || labels.newMessage || "New message"}`;
}

function formatStickerPreview(stickerMessage, labels = {}) {
  if (!stickerMessage?.sticker) return "";
  if (stickerMessage.caption) {
    const template = labels.stickerWithCaption || "Sticker: {{caption}}";
    return template.replace("{{caption}}", stickerMessage.caption);
  }
  return labels.sentSticker || "Sent a sticker";
}

function isImageMime(mimeType, fileName = "") {
  const normalizedMime = String(mimeType || "").toLowerCase();
  if (normalizedMime.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i.test(String(fileName || ""));
}

function sanitizePathSegment(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isMissingMessengerSchema(error) {
  const code = String(error?.code || "");
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST202" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    text.includes("chat_rooms") ||
    text.includes("chat_messages") ||
    text.includes("messages") ||
    text.includes("chat_presence") ||
    text.includes("get_my_chat_room_summaries") ||
    text.includes("get_user_directory")
  );
}

function isMissingRpcFunction(error, functionName) {
  const code = String(error?.code || "").toUpperCase();
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    code === "PGRST202" ||
    code === "PGRST204" ||
    code === "42883" ||
    text.includes(String(functionName || "").toLowerCase())
  );
}

function isPermissionDenied(error) {
  const code = String(error?.code || "").toUpperCase();
  const status = Number(error?.status || 0);
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    code === "42501" ||
    status === 401 ||
    status === 403 ||
    text.includes("permission denied") ||
    text.includes("forbidden") ||
    text.includes("row-level security")
  );
}

function describeSupabaseError(error) {
  const message = normalizeText(error?.message);
  const details = normalizeText(error?.details);
  const hint = normalizeText(error?.hint);
  return [message, details, hint].filter(Boolean).join(" | ");
}

function sortMessages(messages) {
  return [...messages].sort((left, right) => {
    const leftValue = new Date(left?.created_at || 0).getTime();
    const rightValue = new Date(right?.created_at || 0).getTime();
    return leftValue - rightValue;
  });
}

function resolvePresenceStatus(lastSeenAt, nowValue = Date.now()) {
  const lastSeenValue = new Date(lastSeenAt || 0).getTime();
  if (!lastSeenValue || Number.isNaN(lastSeenValue)) return "offline";
  return nowValue - lastSeenValue <= PRESENCE_ONLINE_WINDOW_MS ? "online" : "offline";
}

function normalizeMemberRecord(member, nowValue = Date.now(), fallbackName = "Member") {
  const lastSeenAt = member?.last_seen_at || "";
  return {
    id: String(member?.id || ""),
    name: member?.name || fallbackName,
    email: member?.email || "",
    role: member?.role || "user",
    avatar_url: member?.avatar_url || "",
    status: resolvePresenceStatus(lastSeenAt, nowValue),
    last_seen_at: lastSeenAt,
  };
}

function mergeMembers(previousMembers, nextMembers) {
  const previousMap = new Map(previousMembers.map((member) => [String(member?.id || ""), member]));

  return nextMembers.map((member) => {
    const memberId = String(member?.id || "");
    const previous = previousMap.get(memberId);
    if (!previous) return member;

    if (
      previous.name === member.name &&
      previous.email === member.email &&
      previous.role === member.role &&
      previous.avatar_url === member.avatar_url &&
      previous.status === member.status &&
      previous.last_seen_at === member.last_seen_at
    ) {
      return previous;
    }

    return { ...previous, ...member };
  });
}

function compareMembers(left, right, locale = "en-US") {
  const leftLastMessage = new Date(left?.last_message_created_at || 0).getTime();
  const rightLastMessage = new Date(right?.last_message_created_at || 0).getTime();
  if (leftLastMessage !== rightLastMessage) return rightLastMessage - leftLastMessage;

  const leftUnread = Number(left?.unread_count || 0);
  const rightUnread = Number(right?.unread_count || 0);
  if (leftUnread !== rightUnread) return rightUnread - leftUnread;

  return String(left?.name || "").localeCompare(String(right?.name || ""), locale);
}

const DOCK_EDGE_GAP = 12;
const DOCK_DRAG_HOLD_MS = 180;

function isInteractiveDragTarget(target) {
  return target instanceof Element && Boolean(target.closest("button,a,input,textarea,select,label,[role='button']"));
}

function clampDockPosition(nextPosition, bounds) {
  const width = Number(bounds?.width || 0);
  const height = Number(bounds?.height || 0);
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
  const maxLeft = Math.max(DOCK_EDGE_GAP, viewportWidth - width - DOCK_EDGE_GAP);
  const maxTop = Math.max(DOCK_EDGE_GAP, viewportHeight - height - DOCK_EDGE_GAP);

  return {
    left: Math.min(Math.max(DOCK_EDGE_GAP, Number(nextPosition?.left || 0)), maxLeft),
    top: Math.min(Math.max(DOCK_EDGE_GAP, Number(nextPosition?.top || 0)), maxTop),
  };
}

export default function CentralChatDock({
  currentUser = null,
  openSignal = 0,
  className = "bottom-4 left-4 sm:bottom-6 sm:left-6",
  onOpenChange,
}) {
  const { language, tt } = useScopedI18n(CENTRAL_CHAT_DOCK_TRANSLATIONS);
  const locale = CHAT_LOCALE[language] || CHAT_LOCALE.en;
  const roleLabels = useMemo(
    () => ({
      itSupport: tt("roles.itSupport"),
      itManager: tt("roles.itManager"),
      admin: tt("roles.admin"),
      executive: tt("roles.executive"),
      auditor: tt("roles.auditor"),
      group: tt("roles.group"),
      user: tt("roles.user"),
    }),
    [tt],
  );
  const previewLabels = useMemo(
    () => ({
      startChat: tt("startChat"),
      youPrefix: tt("youPrefix"),
      sentImage: tt("sentImage"),
      sentFile: tt("sentFile"),
      newMessage: tt("newMessage"),
      stickerWithCaption: tt("stickerWithCaption", { caption: "{{caption}}" }),
      sentSticker: tt("sentSticker"),
    }),
    [tt],
  );
  const stickerLabel = useCallback((stickerId) => tt(`stickers.${stickerId}`), [tt]);
  const stickerPreview = useCallback(
    (stickerMessage) => formatStickerPreview(stickerMessage, previewLabels),
    [previewLabels],
  );
  const memberCountLabel = useCallback((count) => tt("memberCount", { count }), [tt]);
  const currentUserId = String(currentUser?.id || "");
  const currentUserRole = normalizeText(currentUser?.role).toLowerCase();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [members, setMembers] = useState([]);
  const [roomSummaries, setRoomSummaries] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState("");
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingGroupAvatarUrl, setEditingGroupAvatarUrl] = useState("");
  const [editingGroupInitialAvatarUrl, setEditingGroupInitialAvatarUrl] = useState("");
  const [editingGroupAvatarFile, setEditingGroupAvatarFile] = useState(null);
  const [editingGroupAvatarPreview, setEditingGroupAvatarPreview] = useState("");
  const [savingGroupSettings, setSavingGroupSettings] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingFilePreview, setPendingFilePreview] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [sending, setSending] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [mobileThreadVisible, setMobileThreadVisible] = useState(false);
  const [typingMemberId, setTypingMemberId] = useState("");
  const [typingMemberName, setTypingMemberName] = useState("");
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const editGroupAvatarInputRef = useRef(null);
  const messageListRef = useRef(null);
  const stickerPickerRef = useRef(null);
  const dockRef = useRef(null);
  const openSignalRef = useRef(openSignal);
  const selectedRoomIdRef = useRef("");
  const loadMessagesRequestRef = useRef(0);
  const typingClearTimerRef = useRef(null);
  const typingChannelRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const pendingSupportOpenRef = useRef(false);
  const dragHoldTimerRef = useRef(null);
  const dragStateRef = useRef(null);
  const launcherDragActiveRef = useRef(false);
  const [dockPosition, setDockPosition] = useState(null);
  const [isDraggingDock, setIsDraggingDock] = useState(false);
  const [presenceTick, setPresenceTick] = useState(() => Date.now());
  const dockInlineStyle = useMemo(() => {
    if (isMobileViewport) {
      if (!isOpen) {
        return { left: "0.75rem", right: "auto", transform: "none", bottom: "1rem", width: "auto" };
      }
      return { left: "0.5rem", right: "0.5rem", transform: "none", bottom: "0.75rem", width: "auto" };
    }

    if (!dockPosition) return undefined;

    return {
      left: `${dockPosition.left}px`,
      top: `${dockPosition.top}px`,
      right: "auto",
      bottom: "auto",
    };
  }, [dockPosition, isMobileViewport]);

  const summaryMap = useMemo(() => {
    const nextMap = new Map();
    roomSummaries.forEach((summary) => {
      const otherUserId = String(summary?.other_user_id || "");
      if (!otherUserId) return;
      nextMap.set(otherUserId, summary);
    });
    return nextMap;
  }, [roomSummaries]);

  const directoryMembers = useMemo(() => {
    const nowValue = presenceTick || Date.now();
    return members
      .filter((member) => String(member?.id || "") !== currentUserId)
      .map((member) => {
        const summary = summaryMap.get(String(member?.id || ""));
        const lastSeenAt = member?.last_seen_at || summary?.other_user_last_seen_at || "";
        const stickerMessage = parseStickerMessage(summary?.last_message);
        const lastPreview = stickerMessage?.sticker
          ? stickerPreview(stickerMessage)
          : previewForSummary(summary, currentUserId, previewLabels);
        return {
          ...member,
          room_id: summary?.room_id || "",
          unread_count: Number(summary?.unread_count || 0),
          last_message_created_at: summary?.last_message_created_at || "",
          last_seen_at: lastSeenAt,
          status: resolvePresenceStatus(lastSeenAt, nowValue),
          last_preview: lastPreview,
        };
      })
      .sort((left, right) => compareMembers(left, right, locale));
  }, [currentUserId, locale, members, presenceTick, previewLabels, stickerPreview, summaryMap]);

  const groupRooms = useMemo(() => {
    return roomSummaries
      .filter((summary) => String(summary?.room_type || "").toLowerCase() === "group")
      .map((summary) => {
        const stickerMessage = parseStickerMessage(summary?.last_message);
        const roomLabel = normalizeText(summary?.room_name) || normalizeText(summary?.other_user_name) || tt("groupChat");
        const lastPreview = stickerMessage?.sticker
          ? stickerPreview(stickerMessage)
          : previewForSummary(summary, currentUserId, previewLabels);
        return {
          id: String(summary?.room_id || ""),
          room_id: String(summary?.room_id || ""),
          name: roomLabel,
          role: "group",
          email: normalizeText(summary?.member_names) || "",
          avatar_url: normalizeText(summary?.group_avatar_url) || "",
          status: summary?.other_user_status || "offline",
          unread_count: Number(summary?.unread_count || 0),
          last_message_created_at: summary?.last_message_created_at || "",
          last_seen_at: summary?.other_user_last_seen_at || "",
          last_preview: lastPreview,
          member_count: Number(summary?.member_count || 0),
          member_ids: Array.isArray(summary?.member_ids) ? summary.member_ids : [],
          my_member_role: normalizeText(summary?.my_member_role).toLowerCase(),
          created_by: String(summary?.created_by || ""),
        };
      })
      .sort((left, right) => compareMembers(left, right, locale));
  }, [currentUserId, locale, previewLabels, roomSummaries, stickerPreview, tt]);

  const normalizedSearch = useMemo(
    () => normalizeText(deferredSearchQuery).toLowerCase(),
    [deferredSearchQuery],
  );

  const filteredGroupRooms = useMemo(() => {
    if (!normalizedSearch) return groupRooms;
    return groupRooms.filter((room) => {
      const haystack = `${room.name || ""} ${room.email || ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [groupRooms, normalizedSearch]);

  const filteredDirectoryMembers = useMemo(() => {
    if (!normalizedSearch) return directoryMembers;
    return directoryMembers
      .filter((member) => {
        const haystack = `${member.name || ""} ${member.email || ""} ${member.role || ""}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .sort((left, right) => compareMembers(left, right, locale));
  }, [directoryMembers, locale, normalizedSearch]);

  const selectedMember = useMemo(() => {
    const selectedId = String(selectedMemberId || "");
    if (!selectedId) return null;

    if (selectedId.startsWith("group:")) {
      const roomId = selectedId.replace("group:", "");
      const room = groupRooms.find((item) => String(item.room_id || "") === roomId);
      if (!room) return null;
      return {
        ...room,
        id: selectedId,
        is_group: true,
      };
    }

    const direct = directoryMembers.find((member) => String(member?.id || "") === selectedId);
    if (!direct) return null;
    return {
      ...direct,
      is_group: false,
    };
  }, [directoryMembers, groupRooms, selectedMemberId]);

  const memberByIdMap = useMemo(() => {
    const nextMap = new Map();
    directoryMembers.forEach((member) => {
      nextMap.set(String(member?.id || ""), member);
    });
    return nextMap;
  }, [directoryMembers]);

  const selectedRoomMemberIds = useMemo(() => {
    if (!selectedMember?.is_group) return [];
    return Array.isArray(selectedMember?.member_ids) ? selectedMember.member_ids : [];
  }, [selectedMember]);

  const selectedRoomSummary = useMemo(() => {
    const activeRoomId = String(selectedRoomId || selectedMember?.room_id || "");
    if (!activeRoomId) return null;
    return roomSummaries.find((summary) => String(summary?.room_id || "") === activeRoomId) || null;
  }, [roomSummaries, selectedMember?.room_id, selectedRoomId]);

  const canManageSelectedGroup = useMemo(() => {
    if (!selectedMember?.is_group) return false;
    if (GROUP_MANAGER_ROLES.has(currentUserRole)) return true;
    return (
      String(selectedRoomSummary?.created_by || "") === currentUserId ||
      String(selectedRoomSummary?.my_member_role || "").toLowerCase() === "owner"
    );
  }, [currentUserId, currentUserRole, selectedMember?.is_group, selectedRoomSummary?.created_by, selectedRoomSummary?.my_member_role]);

  const launcherTitle = selectedMember?.name || tt("centralChat");
  const typingHintVisible = Boolean(typingMemberId) && Boolean(selectedRoomId);

  const scrollToBottom = useCallback((behavior = "auto") => {
    const container = messageListRef.current;
    if (!container) return;
    if (behavior === "smooth") {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, []);

  const scrollToBottomSoon = useCallback((behavior = "auto") => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => scrollToBottom(behavior));
  }, [scrollToBottom]);

  const clearPendingFile = useCallback(() => {
    if (pendingFilePreview) {
      URL.revokeObjectURL(pendingFilePreview);
    }
    setPendingFile(null);
    setPendingFilePreview("");
  }, [pendingFilePreview]);

  const resetEditGroupForm = useCallback(() => {
    if (editingGroupAvatarPreview) {
      URL.revokeObjectURL(editingGroupAvatarPreview);
    }
    setEditingGroupId("");
    setEditingGroupName("");
    setEditingGroupAvatarUrl("");
    setEditingGroupInitialAvatarUrl("");
    setEditingGroupAvatarFile(null);
    setEditingGroupAvatarPreview("");
  }, [editingGroupAvatarPreview]);

  const openEditGroupDialog = useCallback(() => {
    if (!selectedMember?.is_group) return;
    const currentAvatarUrl = normalizeText(selectedMember?.avatar_url || selectedRoomSummary?.group_avatar_url || "");
    if (editingGroupAvatarPreview) {
      URL.revokeObjectURL(editingGroupAvatarPreview);
    }
    setEditingGroupId(String(selectedMember?.room_id || selectedRoomId || ""));
    setEditingGroupName(normalizeText(selectedMember?.name));
    setEditingGroupAvatarUrl(currentAvatarUrl);
    setEditingGroupInitialAvatarUrl(currentAvatarUrl);
    setEditingGroupAvatarFile(null);
    setEditingGroupAvatarPreview("");
    setError("");
    setNotice("");
    setIsEditGroupOpen(true);
  }, [editingGroupAvatarPreview, selectedMember, selectedRoomId, selectedRoomSummary?.group_avatar_url]);

  const uploadGroupAvatar = useCallback(async (file, roomId) => {
    const safeRoomId = sanitizePathSegment(roomId || "group");
    const safeName = sanitizePathSegment(file?.name || `group_${Date.now()}`);
    const filePath = `group/profile/${safeRoomId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-files")
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("chat-files").getPublicUrl(filePath);
    return data?.publicUrl || "";
  }, []);

  const handleEditGroupAvatarSelection = useCallback((file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(tt("groupPhotoTooLarge"));
      return;
    }
    if (!isImageMime(file.type, file.name)) {
      setError(tt("groupPhotoImageOnly"));
      return;
    }

    setError("");
    if (editingGroupAvatarPreview) {
      URL.revokeObjectURL(editingGroupAvatarPreview);
    }

    setEditingGroupAvatarFile(file);
    setEditingGroupAvatarPreview(URL.createObjectURL(file));
  }, [editingGroupAvatarPreview]);

  useEffect(() => {
    return () => {
      if (editingGroupAvatarPreview) {
        URL.revokeObjectURL(editingGroupAvatarPreview);
      }
    };
  }, [editingGroupAvatarPreview]);

  const loadUserDirectory = useCallback(async ({ background = false } = {}) => {
    if (!currentUserId) return;
    if (!background) {
      setMembersLoading(true);
    }
    const { data, error: queryError } = await supabase.rpc("get_user_directory");

    if (queryError) {
      if (isMissingMessengerSchema(queryError)) {
        setNotice(tt("missingSchemaNotice"));
      } else if (isPermissionDenied(queryError)) {
        setNotice(tt("permissionDeniedNotice"));
      } else {
        setError(tt("loadUsersFailed"));
      }
      if (!background) {
        setMembers([]);
        setMembersLoading(false);
      }
      return;
    }
    const normalizedMembers = (data || []).map((member) => normalizeMemberRecord(member, Date.now(), tt("member")));
    setMembers((previousMembers) => mergeMembers(previousMembers, normalizedMembers));
    if (!background) {
      setMembersLoading(false);
    }
  }, [currentUserId, tt]);

  const applyPresenceUpdate = useCallback((payload) => {
    const row = payload?.eventType === "DELETE" ? payload.old : payload.new;
    const memberId = String(row?.user_id || "");
    if (!memberId) return;

    const nextLastSeenAt = row?.last_seen_at || "";
    const nextStatus = payload?.eventType === "DELETE"
      ? "offline"
      : resolvePresenceStatus(nextLastSeenAt);

    let foundMember = false;
    setMembers((previousMembers) => {
      let changed = false;
      const nextMembers = previousMembers.map((member) => {
        if (String(member?.id || "") !== memberId) return member;
        foundMember = true;
        if (member.last_seen_at === nextLastSeenAt && member.status === nextStatus) {
          return member;
        }

        changed = true;
        return {
          ...member,
          last_seen_at: nextLastSeenAt,
          status: nextStatus,
        };
      });

      return changed ? nextMembers : previousMembers;
    });

    if (!foundMember) {
      loadUserDirectory({ background: true });
    }
  }, [loadUserDirectory]);

  const loadRoomSummaries = useCallback(async () => {
    if (!currentUserId) return;
    const { data, error: queryError } = await supabase.rpc("get_my_chat_room_summaries");

    if (queryError && isPermissionDenied(queryError)) {
      setNotice(tt("permissionDeniedNotice"));
      setRoomSummaries([]);
      setTotalUnreadCount(0);
      return;
    }

    if (queryError) {
      if (isMissingMessengerSchema(queryError)) {
        setNotice(tt("missingSchemaNotice"));
      } else {
        setError(tt("loadRoomsFailed"));
      }
      setRoomSummaries([]);
      setTotalUnreadCount(0);
      return;
    }

    const nextSummaries = (data || []).map((summary) => ({
      ...summary,
      room_id: String(summary?.room_id || ""),
      other_user_id: String(summary?.other_user_id || ""),
      unread_count: Number(summary?.unread_count || 0),
      room_type: String(summary?.room_type || "direct").toLowerCase() === "group" ? "group" : "direct",
      room_name: normalizeText(summary?.room_name) || normalizeText(summary?.other_user_name) || "",
      group_avatar_url: normalizeText(summary?.group_avatar_url),
      created_by: String(summary?.created_by || ""),
      my_member_role: normalizeText(summary?.my_member_role).toLowerCase(),
      member_count: Number(summary?.member_count || 0),
      member_ids: Array.isArray(summary?.member_ids) ? summary.member_ids.filter(Boolean).map((id) => String(id)) : [],
      member_names: normalizeText(summary?.member_names),
    }));

    setRoomSummaries(nextSummaries);
    setTotalUnreadCount(
      nextSummaries.reduce((sum, summary) => sum + Number(summary?.unread_count || 0), 0)
    );
  }, [currentUserId, tt]);

  const markMessagesRead = useCallback(async (roomId) => {
    if (!roomId) return;
    await supabase.rpc("mark_room_messages_read", { _room_id: Number(roomId) });
    setMessages((prev) =>
      prev.map((message) =>
        String(message?.sender_id || "") === currentUserId
          ? message
          : { ...message, read_status: true, read_at: message?.read_at || new Date().toISOString() }
      )
    );
  }, [currentUserId]);

  const loadMessages = useCallback(async (roomId) => {
    if (!roomId) {
      setMessages([]);
      return;
    }

    const requestId = Date.now();
    loadMessagesRequestRef.current = requestId;
    setMessagesLoading(true);
    setError("");
    setNotice("");

    const { data, error: queryError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(MESSAGE_LIMIT);

    if (loadMessagesRequestRef.current !== requestId) return;

    if (queryError && isPermissionDenied(queryError)) {
      setNotice(tt("permissionDeniedNotice"));
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    if (queryError) {
      if (isMissingMessengerSchema(queryError)) {
        setNotice(tt("missingSchemaNotice"));
      } else {
        setError(tt("loadMessagesFailed"));
      }
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    setMessages(sortMessages(data || []));
    setMessagesLoading(false);
    await markMessagesRead(roomId);
    await loadRoomSummaries();
    scrollToBottomSoon("auto");
  }, [loadRoomSummaries, markMessagesRead, scrollToBottomSoon, tt]);

  const ensureRoomForMember = useCallback(async (memberId) => {
    if (!memberId || !currentUserId) return null;
    const { data, error: queryError } = await supabase.rpc("get_or_create_chat_room", {
      _other_user_id: memberId,
    });

    if (queryError) {
      if (isMissingMessengerSchema(queryError)) {
        setNotice(tt("missingSchemaNotice"));
      } else {
        setError(tt("createRoomFailed"));
      }
      return null;
    }

    return data || null;
  }, [currentUserId, tt]);

  const selectMember = useCallback(async (memberId, options = {}) => {
    const normalizedId = String(memberId || "");
    if (!normalizedId) return;

    setSelectedMemberId(normalizedId);
    setMobileThreadVisible(true);
    setError("");
    setNotice("");

    const existingSummary = summaryMap.get(normalizedId);
    const existingRoomId = String(existingSummary?.room_id || "");

    if (existingRoomId) {
      setSelectedRoomId(existingRoomId);
      selectedRoomIdRef.current = existingRoomId;
      await loadMessages(existingRoomId);
      return;
    }

    if (options.skipRoomCreation) {
      setSelectedRoomId("");
      selectedRoomIdRef.current = "";
      setMessages([]);
      return;
    }

    const room = await ensureRoomForMember(normalizedId);
    if (!room?.id) return;
    const roomId = String(room.id);
    setSelectedRoomId(roomId);
    selectedRoomIdRef.current = roomId;
    await loadMessages(roomId);
    await loadRoomSummaries();
  }, [ensureRoomForMember, loadMessages, loadRoomSummaries, summaryMap]);

  const selectGroupRoom = useCallback(async (roomId) => {
    const normalizedRoomId = String(roomId || "");
    if (!normalizedRoomId) return;

    setSelectedMemberId(`group:${normalizedRoomId}`);
    setSelectedRoomId(normalizedRoomId);
    selectedRoomIdRef.current = normalizedRoomId;
    setMobileThreadVisible(true);
    setError("");
    setNotice("");
    await loadMessages(normalizedRoomId);
  }, [loadMessages]);

  const chooseDefaultSupportMember = useCallback(async () => {
    const candidate = directoryMembers.find((member) =>
      SUPPORT_ROLES.has(String(member?.role || "").toLowerCase())
    );
    if (!candidate?.id) return;
    await selectMember(candidate.id);
  }, [directoryMembers, selectMember]);

  const toggleGroupMemberSelection = useCallback((memberId, checked) => {
    const normalizedId = String(memberId || "");
    if (!normalizedId) return;
    setGroupMemberIds((previousIds) => {
      if (checked) {
        if (previousIds.includes(normalizedId)) return previousIds;
        return [...previousIds, normalizedId];
      }
      return previousIds.filter((id) => id !== normalizedId);
    });
  }, []);

  const createGroupRoomDirect = useCallback(async (memberIds, roomName) => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    const ownerUserId = String(authUser?.id || currentUserId || "");
    const normalizedMemberIds = [...new Set((memberIds || []).map((memberId) => String(memberId || "")).filter(Boolean))]
      .map((memberId) => (memberId === String(currentUserId || "") ? ownerUserId : memberId));
    const dedupedMemberIds = [...new Set(normalizedMemberIds)];
    const secondMemberId = dedupedMemberIds.find((memberId) => memberId !== ownerUserId);
    if (!ownerUserId || !secondMemberId) {
      throw new Error("Missing group members");
    }

    const { data: roomRow, error: roomError } = await supabase
      .from("chat_rooms")
      .insert({
        user1_id: ownerUserId,
        user2_id: secondMemberId,
        room_type: "group",
        room_name: roomName || tt("groupChat"),
        created_by: ownerUserId,
      })
      .select("id")
      .single();

    if (roomError) throw roomError;

    const roomId = Number(roomRow?.id || 0);
    if (!roomId) {
      throw new Error("Group room id missing");
    }

    const memberRows = dedupedMemberIds.map((memberId) => ({
      room_id: roomId,
      user_id: memberId,
      role: String(memberId) === ownerUserId ? "owner" : "member",
      added_by: ownerUserId,
    }));

    const { error: membersError } = await supabase
      .from("chat_room_members")
      .upsert(memberRows, { onConflict: "room_id,user_id" });

    if (membersError) throw membersError;

    return String(roomId);
  }, [currentUserId, tt]);

  const handleCreateGroup = useCallback(async () => {
    if (creatingGroup) return;
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    const ownerUserId = String(authUser?.id || currentUserId || "");
    if (!ownerUserId) return;
    const uniqueMemberIds = [...new Set([...groupMemberIds, ownerUserId].map((memberId) => String(memberId || "")).filter(Boolean))];
    if (uniqueMemberIds.length < 2) {
      setError(tt("selectAtLeastOneMember"));
      return;
    }

    setCreatingGroup(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        _name: normalizeText(groupNameDraft) || null,
        _member_ids: uniqueMemberIds,
      };
      const fallbackRoomName = normalizeText(groupNameDraft) || null;

      let createdRoomId = "";
      let latestCreateError = null;
      const attemptErrors = [];
      const { data: createdRoomIdV2, error: createV2Error } = await supabase.rpc("create_chat_group_v2", payload);
      if (!createV2Error) {
        createdRoomId = String(createdRoomIdV2 || "");
      } else {
        latestCreateError = createV2Error;
        attemptErrors.push({ step: "create_chat_group_v2", error: createV2Error });
        const { data, error: createError } = await supabase.rpc("create_chat_group", payload);
        if (!createError) {
          createdRoomId = String(data?.id || data?.room_id || "");
        } else {
          latestCreateError = createError;
          attemptErrors.push({ step: "create_chat_group", error: createError });
          try {
            createdRoomId = await createGroupRoomDirect(uniqueMemberIds, fallbackRoomName);
          } catch (directInsertError) {
            directInsertError.attemptErrors = attemptErrors;
            throw directInsertError;
          }
        }
      }

      if (!createdRoomId) {
        throw latestCreateError || new Error("Group room id missing");
      }

      await loadRoomSummaries();
      setIsCreateGroupOpen(false);
      setGroupMemberIds([]);
      setGroupNameDraft("");

      if (createdRoomId) {
        await selectGroupRoom(createdRoomId);
      }
    } catch (createError) {
      console.error("createGroup failed", {
        createError,
        attemptErrors: createError?.attemptErrors || [],
      });
      console.error("createGroup failed details", {
        code: createError?.code || "",
        message: createError?.message || "",
        details: createError?.details || "",
        hint: createError?.hint || "",
        attemptErrors: (createError?.attemptErrors || []).map((attempt) => ({
          step: attempt?.step || "",
          code: attempt?.error?.code || "",
          message: attempt?.error?.message || "",
          details: attempt?.error?.details || "",
          hint: attempt?.error?.hint || "",
        })),
      });
      if (isMissingMessengerSchema(createError)) {
        setNotice(tt("missingSchemaNotice"));
      } else if (isPermissionDenied(createError)) {
        setNotice(tt("createGroupPermissionDenied"));
      } else {
        const rawErrorText = [
          `${createError?.message || ""} ${createError?.details || ""} ${createError?.hint || ""}`,
          ...(createError?.attemptErrors || []).map((attempt) =>
            `${attempt?.step || ""} ${attempt?.error?.message || ""} ${attempt?.error?.details || ""} ${attempt?.error?.hint || ""}`,
          ),
        ].join(" ").toLowerCase();
        if (
          rawErrorText.includes("duplicate key") &&
          rawErrorText.includes("user1") &&
          rawErrorText.includes("user2")
        ) {
          setError(tt("legacyUniqueKey"));
          setCreatingGroup(false);
          return;
        }
        if (rawErrorText.includes("chat_rooms_id_seq") && rawErrorText.includes("permission")) {
          setError(tt("legacySequencePermission"));
          setCreatingGroup(false);
          return;
        }
        if (
          rawErrorText.includes("chat_rooms_order_check") ||
          rawErrorText.includes("chat_rooms_direct_order_check") ||
          (rawErrorText.includes("check constraint") && rawErrorText.includes("chat_rooms"))
        ) {
          setError(tt("legacyDirectConstraint"));
          setCreatingGroup(false);
          return;
        }
        const errorDetail = describeSupabaseError(createError);
        setError(errorDetail ? `${tt("createGroupFailed")}: ${errorDetail}` : tt("createGroupFailed"));
      }
    } finally {
      setCreatingGroup(false);
    }
  }, [createGroupRoomDirect, creatingGroup, currentUserId, groupMemberIds, groupNameDraft, loadRoomSummaries, selectGroupRoom, tt]);

  const handleSaveGroupSettings = useCallback(async () => {
    if (!editingGroupId || savingGroupSettings) return;

    setSavingGroupSettings(true);
    setError("");
    setNotice("");

    try {
      let nextAvatarUrl = normalizeText(editingGroupAvatarUrl);
      if (editingGroupAvatarFile) {
        nextAvatarUrl = await uploadGroupAvatar(editingGroupAvatarFile, editingGroupId);
      }

      const clearAvatar = !nextAvatarUrl && Boolean(editingGroupInitialAvatarUrl) && !editingGroupAvatarFile;
      const { error: updateError } = await supabase.rpc("update_chat_group_details", {
        _room_id: Number(editingGroupId),
        _room_name: normalizeText(editingGroupName) || null,
        _group_avatar_url: nextAvatarUrl || null,
        _clear_avatar: clearAvatar,
      });

      if (updateError) throw updateError;

      await loadRoomSummaries();
      setIsEditGroupOpen(false);
      resetEditGroupForm();
    } catch (updateError) {
      if (isMissingMessengerSchema(updateError) || isMissingRpcFunction(updateError, "update_chat_group_details")) {
        setNotice(tt("migrationNotice"));
      } else if (isPermissionDenied(updateError)) {
        setError(tt("editGroupDenied"));
      } else {
        const errorDetail = describeSupabaseError(updateError);
        setError(errorDetail ? `${tt("updateGroupFailed")}: ${errorDetail}` : tt("updateGroupFailed"));
      }
    } finally {
      setSavingGroupSettings(false);
    }
  }, [
    editingGroupAvatarFile,
    editingGroupAvatarUrl,
    editingGroupId,
    editingGroupInitialAvatarUrl,
    editingGroupName,
    loadRoomSummaries,
    resetEditGroupForm,
    savingGroupSettings,
    tt,
    uploadGroupAvatar,
  ]);

  const handleDeleteGroup = useCallback(async () => {
    if (!editingGroupId || deletingGroup) return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(tt("confirmDeleteGroup"));
      if (!confirmed) return;
    }

    setDeletingGroup(true);
    setError("");
    setNotice("");

    try {
      const { data, error: deleteError } = await supabase.rpc("delete_chat_group", {
        _room_id: Number(editingGroupId),
      });

      if (deleteError) throw deleteError;
      if (!data) {
        throw new Error(tt("deleteGroupDidNotComplete"));
      }

      if (String(selectedRoomIdRef.current || "") === String(editingGroupId)) {
        setSelectedMemberId("");
        setSelectedRoomId("");
        selectedRoomIdRef.current = "";
        setMessages([]);
        setMobileThreadVisible(false);
      }

      await loadRoomSummaries();
      setIsEditGroupOpen(false);
      resetEditGroupForm();
    } catch (deleteError) {
      if (isMissingMessengerSchema(deleteError) || isMissingRpcFunction(deleteError, "delete_chat_group")) {
        setNotice(tt("migrationNotice"));
      } else if (isPermissionDenied(deleteError)) {
        setError(tt("deleteGroupDenied"));
      } else {
        const errorDetail = describeSupabaseError(deleteError);
        setError(errorDetail ? `${tt("deleteGroupFailed")}: ${errorDetail}` : tt("deleteGroupFailed"));
      }
    } finally {
      setDeletingGroup(false);
    }
  }, [deletingGroup, editingGroupId, loadRoomSummaries, resetEditGroupForm, tt]);

  const uploadAttachment = useCallback(async (file) => {
    const safeUserId = sanitizePathSegment(currentUserId || "unknown");
    const safeName = sanitizePathSegment(file?.name || `file_${Date.now()}`);
    const folder = selectedMember?.is_group ? "group" : "direct";
    const filePath = `${folder}/${safeUserId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-files")
      .upload(filePath, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("chat-files").getPublicUrl(filePath);
    return data?.publicUrl || "";
  }, [currentUserId, selectedMember?.is_group]);

  const handleIncomingFile = useCallback((file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(tt("attachmentTooLarge"));
      return;
    }

    setError("");
    if (pendingFilePreview) {
      URL.revokeObjectURL(pendingFilePreview);
    }

    const preview = isImageMime(file.type, file.name) ? URL.createObjectURL(file) : "";
    setPendingFile(file);
    setPendingFilePreview(preview);
  }, [pendingFilePreview, tt]);

  const handleSend = useCallback(async () => {
    const content = normalizeText(draft);
    const selectedId = String(selectedMemberId || "");
    const isGroupTarget = selectedId.startsWith("group:");
    if ((!content && !pendingFile) || sending || !currentUserId || !selectedId) return;

    setSending(true);
    setError("");
    setNotice("");

    let roomId = String(selectedRoomIdRef.current || "");
    if (!roomId) {
      if (isGroupTarget) {
        setSending(false);
        setError(tt("groupRoomMissing"));
        return;
      }

      const room = await ensureRoomForMember(selectedId);
      if (!room?.id) {
        setSending(false);
        return;
      }
      roomId = String(room.id);
      setSelectedRoomId(roomId);
      selectedRoomIdRef.current = roomId;
    }

    try {
      let fileUrl = null;
      let fileName = null;
      let fileMimeType = null;
      let fileSize = null;
      let messageType = "text";

      if (pendingFile) {
        fileUrl = await uploadAttachment(pendingFile);
        fileName = pendingFile.name || null;
        fileMimeType = pendingFile.type || null;
        fileSize = pendingFile.size || null;
        messageType = isImageMime(pendingFile.type, pendingFile.name) ? "image" : "file";
      }

      const payload = {
        room_id: Number(roomId),
        message: content || null,
        type: messageType,
        file_url: fileUrl,
        file_name: fileName,
        file_mime_type: fileMimeType,
        file_size: fileSize,
      };

      const { data, error: insertError } = await supabase
      .from("chat_messages")
        .insert(payload)
        .select("*")
        .single();

      if (insertError) throw insertError;

      setDraft("");
      clearPendingFile();
      if (data) {
        setMessages((prev) => {
          if (prev.some((message) => String(message?.id || "") === String(data?.id || ""))) return prev;
          return sortMessages([...prev, data]);
        });
      }

      await loadRoomSummaries();
      scrollToBottomSoon("smooth");
    } catch (sendError) {
      if (isMissingMessengerSchema(sendError)) {
        setNotice(tt("missingSchemaNotice"));
      } else if (isPermissionDenied(sendError)) {
        setNotice(tt("sendPermissionDenied"));
      } else {
        setError(tt("sendFailed"));
      }
    } finally {
      setSending(false);
    }
  }, [
    clearPendingFile,
    currentUserId,
    draft,
    ensureRoomForMember,
    loadRoomSummaries,
    pendingFile,
    scrollToBottom,
    scrollToBottomSoon,
    selectedMemberId,
    sending,
    tt,
    uploadAttachment,
  ]);

  const handleStickerSelect = useCallback(async (stickerId) => {
    const selectedId = String(selectedMemberId || "");
    const isGroupTarget = selectedId.startsWith("group:");
    if (!selectedMember || sending || !currentUserId || !selectedId) return;

    setStickerPickerOpen(false);
    setSending(true);
    setError("");
    setNotice("");

    let roomId = String(selectedRoomIdRef.current || "");
    if (!roomId) {
      if (isGroupTarget) {
        setSending(false);
        setError(tt("groupRoomMissing"));
        return;
      }

      const room = await ensureRoomForMember(selectedId);
      if (!room?.id) {
        setSending(false);
        return;
      }
      roomId = String(room.id);
      setSelectedRoomId(roomId);
      selectedRoomIdRef.current = roomId;
    }

    try {
      const payload = {
        room_id: Number(roomId),
        message: buildStickerToken(stickerId),
        type: "text",
        file_url: null,
        file_name: null,
        file_mime_type: null,
        file_size: null,
      };

      const { data, error: insertError } = await supabase
        .from("chat_messages")
        .insert(payload)
        .select("*")
        .single();

      if (insertError) throw insertError;

      if (data) {
        setMessages((prev) => {
          if (prev.some((message) => String(message?.id || "") === String(data?.id || ""))) return prev;
          return sortMessages([...prev, data]);
        });
      }

      await loadRoomSummaries();
      scrollToBottomSoon("smooth");
    } catch (sendError) {
      if (isMissingMessengerSchema(sendError)) {
        setNotice(tt("missingSchemaNotice"));
      } else if (isPermissionDenied(sendError)) {
        setNotice(tt("sendStickerDenied"));
      } else {
        setError(tt("sendStickerFailed"));
      }
    } finally {
      setSending(false);
    }
  }, [
    currentUserId,
    ensureRoomForMember,
    loadRoomSummaries,
    scrollToBottomSoon,
    selectedMember,
    selectedMemberId,
    sending,
    tt,
  ]);

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleComposerPaste = useCallback((event) => {
    const clipboardItems = Array.from(event.clipboardData?.items || []);
    const imageItem = clipboardItems.find((item) => String(item?.type || "").startsWith("image/"));
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    event.preventDefault();
    handleIncomingFile(file);
  }, [handleIncomingFile]);

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    handleIncomingFile(file);
  };

  const handleDockPointerDown = useCallback(
    (event, options = {}) => {
      const allowInteractiveTarget = Boolean(options?.allowInteractiveTarget);
      if (
        isMobileViewport ||
        event.button !== 0 ||
        event.defaultPrevented ||
        (!allowInteractiveTarget && isInteractiveDragTarget(event.target))
      ) {
        return;
      }

      const dockNode = dockRef.current || event.currentTarget;
      if (!dockNode) return;

      const rect = dockNode.getBoundingClientRect();
      const startLeft = rect.left;
      const startTop = rect.top;
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      if (dragHoldTimerRef.current) {
        clearTimeout(dragHoldTimerRef.current);
      }

      dragStateRef.current = {
        pointerId: event.pointerId,
        offsetX,
        offsetY,
        width: rect.width,
        height: rect.height,
        startLeft,
        startTop,
        source: allowInteractiveTarget ? "launcher" : "dock",
      };

      dragHoldTimerRef.current = window.setTimeout(() => {
        const activeState = dragStateRef.current;
        if (!activeState || activeState.pointerId !== event.pointerId) return;
        dragHoldTimerRef.current = null;
        if (activeState.source === "launcher") {
          launcherDragActiveRef.current = true;
        }
        const nextPosition = clampDockPosition(
          { left: activeState.startLeft, top: activeState.startTop },
          { width: activeState.width, height: activeState.height }
        );
        setDockPosition(nextPosition);
        setIsDraggingDock(true);
      }, DOCK_DRAG_HOLD_MS);

      const cancelPendingDrag = (cancelEvent) => {
        const activeState = dragStateRef.current;
        const samePointer = !activeState || activeState.pointerId === cancelEvent?.pointerId;
        if (!samePointer) return;

        if (dragHoldTimerRef.current) {
          clearTimeout(dragHoldTimerRef.current);
          dragHoldTimerRef.current = null;
          dragStateRef.current = null;
          launcherDragActiveRef.current = false;
          return;
        }

        dragStateRef.current = null;
      };

      window.addEventListener("pointerup", cancelPendingDrag, { once: true });
      window.addEventListener("pointercancel", cancelPendingDrag, { once: true });

      if (!allowInteractiveTarget) {
        event.preventDefault();
      }
    },
    [isMobileViewport]
  );

  const handleLauncherClick = useCallback(() => {
    if (launcherDragActiveRef.current) {
      launcherDragActiveRef.current = false;
      return;
    }
    setIsOpen(true);
    setIsCollapsed(false);
  }, []);

  useEffect(() => {
    if (!isDraggingDock) return undefined;

    const finishDragging = () => {
      setIsDraggingDock(false);
      dragStateRef.current = null;
      if (dragHoldTimerRef.current) {
        clearTimeout(dragHoldTimerRef.current);
        dragHoldTimerRef.current = null;
      }
    };

    const handlePointerMove = (event) => {
      const activeState = dragStateRef.current;
      if (!activeState) return;
      event.preventDefault();

      const nextPosition = clampDockPosition(
        {
          left: event.clientX - activeState.offsetX,
          top: event.clientY - activeState.offsetY,
        },
        { width: activeState.width, height: activeState.height }
      );

      setDockPosition(nextPosition);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", finishDragging);
    window.addEventListener("pointercancel", finishDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDragging);
      window.removeEventListener("pointercancel", finishDragging);
    };
  }, [isDraggingDock]);

  useEffect(() => {
    if (!dockPosition || typeof window === "undefined") return undefined;

    const handleResize = () => {
      const dockNode = dockRef.current;
      if (!dockNode) return;
      const rect = dockNode.getBoundingClientRect();
      setDockPosition((current) => (current ? clampDockPosition(current, rect) : current));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [dockPosition]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const onChange = (event) => {
      setIsMobileViewport(event.matches);
    };
    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    selectedRoomIdRef.current = String(selectedRoomId || "");
  }, [selectedRoomId]);

  useEffect(() => {
    if (!currentUserId) return;
    loadUserDirectory();
    loadRoomSummaries();
  }, [currentUserId, loadRoomSummaries, loadUserDirectory]);

  useEffect(() => {
    if (!currentUserId) return undefined;

    const interval = window.setInterval(() => {
      setPresenceTick(Date.now());
    }, PRESENCE_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [currentUserId, tt]);

  useEffect(() => {
    if (selectedMemberId) return;
    const firstSummary = roomSummaries[0];
    if (!firstSummary?.room_id) return;

    if (String(firstSummary.room_type || "").toLowerCase() === "group") {
      setSelectedMemberId(`group:${String(firstSummary.room_id)}`);
    } else if (firstSummary.other_user_id) {
      setSelectedMemberId(String(firstSummary.other_user_id));
    } else {
      return;
    }

    setSelectedRoomId(String(firstSummary.room_id || ""));
    selectedRoomIdRef.current = String(firstSummary.room_id || "");
  }, [roomSummaries, selectedMemberId]);

  useEffect(() => {
    if (isCreateGroupOpen) return;
    setGroupMemberIds([]);
    setGroupNameDraft("");
  }, [isCreateGroupOpen]);

  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([]);
      return;
    }
    loadMessages(selectedRoomId);
  }, [loadMessages, selectedRoomId]);

  useEffect(() => {
    if (!isOpen || !selectedRoomId || !messages.length) return;
    const timer = window.setTimeout(() => scrollToBottom("auto"), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, messages.length, scrollToBottom, selectedRoomId]);

  useEffect(() => {
    if (openSignalRef.current === openSignal) return;
    openSignalRef.current = openSignal;
    setIsOpen(true);
    setIsCollapsed(false);
    pendingSupportOpenRef.current = true;
  }, [openSignal]);

  useEffect(() => {
    if (!pendingSupportOpenRef.current) return;
    if (!directoryMembers.length) return;
    pendingSupportOpenRef.current = false;
    chooseDefaultSupportMember();
  }, [chooseDefaultSupportMember, directoryMembers]);

  useEffect(() => {
    if (!stickerPickerOpen) return undefined;

    const handlePointerDown = (event) => {
      if (stickerPickerRef.current?.contains(event.target)) return;
      setStickerPickerOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [stickerPickerOpen]);

  useEffect(() => {
    setStickerPickerOpen(false);
  }, [selectedMemberId]);

  useEffect(() => {
    if (!currentUserId) return undefined;

    const syncPresence = async () => {
      const { error: presenceError } = await supabase.rpc("touch_chat_presence");
      if (!presenceError) return;
      if (isMissingMessengerSchema(presenceError)) {
        setNotice(tt("missingSchemaNotice"));
        return;
      }
      if (isPermissionDenied(presenceError)) {
        setNotice(tt("permissionDeniedNotice"));
      }
    };

    syncPresence();

    const interval = window.setInterval(syncPresence, PRESENCE_INTERVAL_MS);
    const handleFocus = () => {
      syncPresence();
    };
    const handleVisibility = () => {
      if (!document.hidden) syncPresence();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return undefined;

    const resyncDirectory = () => {
      loadUserDirectory({ background: true });
    };

    const interval = window.setInterval(resyncDirectory, DIRECTORY_RESYNC_INTERVAL_MS);
    window.addEventListener("focus", resyncDirectory);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", resyncDirectory);
    };
  }, [currentUserId, loadUserDirectory]);

  useEffect(() => {
    if (!currentUserId) return undefined;

    const channel = supabase
      .channel(`messenger-db-${currentUserId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        async (payload) => {
          const row = payload.eventType === "DELETE" ? payload.old : payload.new;
          const roomId = String(row?.room_id || "");
          const senderId = String(row?.sender_id || "");
          const isIncoming = senderId && senderId !== currentUserId;

          if (payload.eventType === "INSERT" && roomId && roomId === String(selectedRoomIdRef.current || "")) {
            setMessages((prev) => {
              if (prev.some((message) => String(message?.id || "") === String(row?.id || ""))) return prev;
              return sortMessages([...prev, row]);
            });
            if (isIncoming) {
              await markMessagesRead(roomId);
            }
          } else if (payload.eventType === "UPDATE" && roomId && roomId === String(selectedRoomIdRef.current || "")) {
            setMessages((prev) =>
              prev.map((message) =>
                String(message?.id || "") === String(row?.id || "") ? { ...message, ...row } : message
              )
            );
          }

          await loadRoomSummaries();

          if (isIncoming) {
            setIsOpen(true);
            setIsCollapsed(false);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_rooms" },
        () => {
          loadRoomSummaries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_room_members" },
        () => {
          loadRoomSummaries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_presence" },
        (payload) => {
          applyPresenceUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [applyPresenceUpdate, currentUserId, loadRoomSummaries, markMessagesRead]);

  useEffect(() => {
    if (!selectedRoomId || !currentUserId) return undefined;

    const channel = supabase
      .channel(`messenger-typing-${selectedRoomId}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const roomId = String(payload?.roomId || "");
        const memberId = String(payload?.memberId || "");
        if (roomId !== String(selectedRoomId) || !memberId || memberId === currentUserId) return;

        setTypingMemberId(memberId);
        setTypingMemberName(payload?.memberName || tt("member"));

        if (typingClearTimerRef.current) {
          clearTimeout(typingClearTimerRef.current);
        }

        typingClearTimerRef.current = setTimeout(() => {
          setTypingMemberId("");
          setTypingMemberName("");
        }, 1600);
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      if (typingClearTimerRef.current) {
        clearTimeout(typingClearTimerRef.current);
      }
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [currentUserId, selectedRoomId, tt]);

  useEffect(() => {
    const content = normalizeText(draft);
    if (!content || !selectedRoomId || !typingChannelRef.current) return;

    const now = Date.now();
    if (now - lastTypingSentRef.current < 700) return;
    lastTypingSentRef.current = now;

    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        roomId: String(selectedRoomId),
        memberId: currentUserId,
        memberName: currentUser?.name || currentUser?.full_name || tt("member"),
      },
    });
  }, [currentUser?.full_name, currentUser?.name, currentUserId, draft, selectedRoomId, tt]);

  useEffect(() => {
    if (!isOpen || isCollapsed) return;
    setTotalUnreadCount(
      roomSummaries.reduce((sum, summary) => sum + Number(summary?.unread_count || 0), 0)
    );
  }, [isCollapsed, isOpen, roomSummaries]);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    return () => {
      if (pendingFilePreview) {
        URL.revokeObjectURL(pendingFilePreview);
      }
      if (typingClearTimerRef.current) {
        clearTimeout(typingClearTimerRef.current);
      }
    };
  }, [pendingFilePreview]);

  if (!currentUserId) return null;

  if (!isOpen) {
    return (
      <div className={`fixed ${className} z-[90] pointer-events-none`} style={dockInlineStyle}>
        <button
          type="button"
          onClick={handleLauncherClick}
          onPointerDown={(event) => handleDockPointerDown(event, { allowInteractiveTarget: true })}
          className={`pointer-events-auto inline-flex items-center gap-3 rounded-full border border-[#12b981]/20 bg-white px-4 py-3 text-left shadow-[0_24px_60px_-28px_rgba(43,89,176,0.45)] transition hover:-translate-y-1 hover:border-[#12b981]/35 ${
            isDraggingDock ? "cursor-grabbing" : "cursor-grab"
          } ${isMobileViewport ? "h-14 w-14 justify-center px-0" : ""}`}
          aria-label={tt("openChat")}
          title={tt("dragToMove")}
        >
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-[#2b59b0] to-[#244a95] text-white shadow-[0_14px_26px_-14px_rgba(16,185,129,0.55)]">
            <span className="absolute inset-0 rounded-full bg-emerald-400/25 opacity-70 blur-[2px] animate-pulse" aria-hidden="true" />
            <MessageCircle size={20} className="relative drop-shadow-[0_1px_1px_rgba(15,23,42,0.25)]" />
            {totalUnreadCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
              </span>
            )}
          </span>
          {!isMobileViewport && (
            <span className="min-w-0">
            <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              {tt("centralChat")}
            </span>
            <span className="block max-w-[220px] truncate text-sm font-bold text-slate-800">
              {launcherTitle}
            </span>
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={dockRef}
      className={`fixed ${className} z-[90] pointer-events-none ${isMobileViewport ? "w-[calc(100vw-1rem)] max-h-[min(76dvh,620px)]" : "w-[min(96vw,860px)] max-h-[calc(100dvh-1rem)]"}`}
      style={dockInlineStyle}
    >
      <div className={`pointer-events-auto overflow-hidden border border-[#2b59b0]/15 bg-white shadow-[0_34px_90px_-30px_rgba(15,23,42,0.28)] ${isMobileViewport ? "max-h-[min(76dvh,620px)] rounded-[1.5rem]" : "max-h-[calc(100dvh-1rem)] rounded-[2rem]"}`}>
        <div
          className={`flex items-start justify-between gap-3 bg-gradient-to-r from-[#eff4ff] via-white to-[#f6f9ff] ${isMobileViewport ? "px-3 py-2" : "px-4 py-3"} ${
            isDraggingDock ? "select-none cursor-grabbing" : "cursor-grab select-none"
          }`}
          onPointerDown={(event) => handleDockPointerDown(event, { allowInteractiveTarget: false })}
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <div className={`${isMobileViewport ? "hidden" : "mt-0.5 inline-flex"} h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#2b59b0]/10 bg-white text-[#2b59b0] shadow-[0_10px_22px_-16px_rgba(43,89,176,0.45)]`}>
              <GripVertical size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2b59b0]/70">{tt("centralMessage")}</p>
              <h3 className={`truncate font-black text-slate-900 ${isMobileViewport ? "mt-0.5 text-sm" : "mt-1 text-base"}`}>
                {isMobileViewport ? tt("centralChat") : selectedMember ? selectedMember.name : tt("chooseConversation")}
              </h3>
              {!isMobileViewport && (
                <p className="mt-1 text-xs text-slate-500">
                {totalUnreadCount > 0 ? tt("unreadMessages", { count: totalUnreadCount }) : tt("allChatsHint")}
                </p>
              )}
            </div>
          </div>

          <div className={`flex items-center ${isMobileViewport ? "gap-1.5" : "gap-2"}`}>
            <button
              type="button"
              onClick={() => setIsCollapsed((value) => !value)}
              className={`inline-flex items-center justify-center border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 ${isMobileViewport ? "h-8 w-8 rounded-xl" : "h-9 w-9 rounded-2xl"}`}
              aria-label={isCollapsed ? tt("expandWindow") : tt("collapseWindow")}
            >
              <Circle size={12} className={isCollapsed ? "fill-current text-[#2b59b0]" : "text-slate-400"} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsCollapsed(false);
              }}
              className={`inline-flex items-center justify-center border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 ${isMobileViewport ? "h-8 w-8 rounded-xl" : "h-9 w-9 rounded-2xl"}`}
              aria-label={tt("closeWindow")}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {!isCollapsed ? (
          <>
          <div className={`relative grid min-h-0 grid-cols-1 overflow-hidden md:grid-cols-[280px,1fr] ${isMobileViewport ? "h-[min(66dvh,540px)]" : "max-h-[calc(100dvh-4.5rem)] md:h-[min(78dvh,640px)]"}`}>
            <aside className={`${mobileThreadVisible ? "hidden md:flex" : "flex"} min-h-0 flex-col border-b border-slate-200 bg-[#fbfcff] md:border-b-0 md:border-r`}>
              <div className="border-b border-slate-200 px-3 py-3">
                <div className="flex items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={tt("search")}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-[#2b59b0] focus:outline-none focus:ring-2 focus:ring-[#2b59b0]/15"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateGroupOpen(true)}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
                    aria-label={tt("createGroup")}
                    title={tt("createGroup")}
                  >
                    <UserPlus size={16} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2 py-2">
                {membersLoading ? (
                  <div className="flex items-center gap-2 rounded-2xl px-3 py-3 text-sm text-slate-500">
                    <Loader2 size={15} className="animate-spin" />
                    {tt("loadingMembers")}
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{tt("groups")}</p>
                      {filteredGroupRooms.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-400">
                          {tt("noGroups")}
                        </div>
                      ) : (
                        filteredGroupRooms.map((room) => {
                          const isActive = String(selectedMemberId || "") === `group:${room.room_id}`;
                          return (
                            <button
                              key={`group-${room.room_id}`}
                              type="button"
                              onClick={() => selectGroupRoom(room.room_id)}
                              className={`mb-1 flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                                isActive
                                  ? "bg-white shadow-[0_12px_26px_-20px_rgba(43,89,176,0.55)] ring-1 ring-[#2b59b0]/15"
                                  : "hover:bg-white"
                              }`}
                            >
                              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[#2b59b0] overflow-hidden">
                                {room.avatar_url ? (
                                  <img
                                    src={toAvatarUrl(room.avatar_url, room.name, "2b59b0")}
                                    alt={room.name}
                                    onError={(event) => {
                                      event.currentTarget.src = buildAvatarFallback(room.name, "2b59b0");
                                    }}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Users size={16} />
                                )}
                                <span className="absolute bottom-0 right-0 inline-flex min-w-4 items-center justify-center rounded-full border border-white bg-slate-900 px-1 text-[9px] font-black text-white">
                                  {room.member_count > 9 ? "9+" : Math.max(room.member_count, 2)}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-sm font-bold text-slate-900">{room.name}</p>
                                  <span className="shrink-0 text-[11px] text-slate-400">
                                    {formatRelativeClock(room.last_message_created_at || room.last_seen_at, locale)}
                                  </span>
                                </div>
                                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                  {room.email || memberCountLabel(Math.max(room.member_count, 2))}
                                </p>
                                <div className="mt-1 flex items-center justify-between gap-2">
                                  <p className="truncate text-xs text-slate-500">{room.last_preview}</p>
                                  {room.unread_count > 0 && (
                                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                                      {room.unread_count > 9 ? "9+" : room.unread_count}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div>
                      <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{tt("people")}</p>
                      {filteredDirectoryMembers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-400">
                          {tt("noUsers")}
                        </div>
                      ) : (
                        filteredDirectoryMembers.map((member) => {
                          const isActive = String(member.id) === String(selectedMemberId || "");
                          const avatarUrl = toAvatarUrl(member.avatar_url, member.name, member.status === "online" ? "059669" : "64748b");
                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => selectMember(member.id)}
                              className={`mb-1 flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                                isActive
                                  ? "bg-white shadow-[0_12px_26px_-20px_rgba(43,89,176,0.55)] ring-1 ring-[#2b59b0]/15"
                                  : "hover:bg-white"
                              }`}
                            >
                              <div className="relative">
                                <img
                                  src={avatarUrl}
                                  alt={member.name}
                                  onError={(event) => {
                                    event.currentTarget.src = buildAvatarFallback(member.name, "2b59b0");
                                  }}
                                  className="h-11 w-11 rounded-full border border-slate-200 bg-white object-cover"
                                />
                                <span
                                  className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${
                                    member.status === "online" ? "bg-emerald-500" : "bg-slate-300"
                                  }`}
                                  aria-hidden="true"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-sm font-bold text-slate-900">{member.name}</p>
                                  <span className="shrink-0 text-[11px] text-slate-400">
                                    {formatRelativeClock(member.last_message_created_at || member.last_seen_at, locale)}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                  {roleLabel(member.role, roleLabels)}
                                </p>
                                <div className="mt-1 flex items-center justify-between gap-2">
                                  <p className="truncate text-xs text-slate-500">{member.last_preview}</p>
                                  {member.unread_count > 0 && (
                                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                                      {member.unread_count > 9 ? "9+" : member.unread_count}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </aside>

            <section className={`${mobileThreadVisible ? "flex" : "hidden md:flex"} min-h-0 flex-col overflow-hidden bg-white`}>
              <div className={`shrink-0 flex items-center gap-3 border-b border-slate-200 bg-white/95 backdrop-blur ${isMobileViewport ? "px-3 py-2" : "px-4 py-3"}`}>
                <button
                  type="button"
                  onClick={() => setMobileThreadVisible(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 md:hidden"
                  aria-label={tt("backToChatList")}
                >
                  <ArrowLeft size={15} />
                </button>

                {selectedMember ? (
                  <>
                    {selectedMember?.is_group ? (
                      selectedMember.avatar_url ? (
                        <img
                          src={toAvatarUrl(selectedMember.avatar_url, selectedMember.name, "2b59b0")}
                          alt={selectedMember.name}
                          onError={(event) => {
                            event.currentTarget.src = buildAvatarFallback(selectedMember.name, "2b59b0");
                          }}
                          className={`${isMobileViewport ? "h-10 w-10" : "h-11 w-11"} rounded-full border border-slate-200 bg-white object-cover`}
                        />
                      ) : (
                        <div className={`${isMobileViewport ? "h-10 w-10" : "h-11 w-11"} inline-flex items-center justify-center rounded-full border border-slate-200 bg-white text-[#2b59b0]`}>
                          <Users size={16} />
                        </div>
                      )
                    ) : (
                      <img
                        src={toAvatarUrl(selectedMember.avatar_url, selectedMember.name, selectedMember.status === "online" ? "059669" : "64748b")}
                        alt={selectedMember.name}
                        onError={(event) => {
                          event.currentTarget.src = buildAvatarFallback(selectedMember.name, "2b59b0");
                        }}
                        className={`${isMobileViewport ? "h-10 w-10" : "h-11 w-11"} rounded-full border border-slate-200 bg-white object-cover`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-sm font-black text-slate-900">{selectedMember.name}</h4>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          selectedMember.status === "online"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {selectedMember.status === "online" ? tt("online") : tt("offline")}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-slate-500">
                        {selectedMember?.is_group
                          ? memberCountLabel(Math.max(Number(selectedMember?.member_count || selectedRoomMemberIds.length || 0), 2))
                          : roleLabel(selectedMember.role, roleLabels)}
                        {!isMobileViewport && !selectedMember?.is_group && selectedMember.email ? ` | ${selectedMember.email}` : ""}
                      </p>
                    </div>
                    {selectedMember?.is_group && canManageSelectedGroup ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={openEditGroupDialog}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                          aria-label={tt("editGroup")}
                          title={tt("editGroup")}
                        >
                          <Pencil size={15} />
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{tt("selectConversationTitle")}</h4>
                    <p className="text-xs text-slate-500">{tt("selectConversationSubtitle")}</p>
                  </div>
                )}
              </div>

              <div
                className={`relative min-h-0 flex-1 overflow-hidden ${dragActive ? "bg-[#eef4ff]" : "bg-white"}`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (event.currentTarget.contains(event.relatedTarget)) return;
                  setDragActive(false);
                }}
                onDrop={handleDrop}
              >
                <div
                  ref={messageListRef}
                  className={`${isMobileViewport ? "px-3 py-3 pb-14" : "px-4 py-4 pb-12"} h-full min-h-0 space-y-3 overflow-y-auto`}
                >
                  {messagesLoading ? (
                    <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
                      <Loader2 size={16} className="animate-spin" />
                      {tt("loadingMessages")}
                    </div>
                  ) : !selectedMember ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                        <MessageCircle size={24} className="mx-auto text-[#2b59b0]" />
                        <p className="mt-3 text-sm font-semibold text-slate-700">{tt("emptyConversationTitle")}</p>
                        <p className="mt-1 text-xs text-slate-500">{tt("emptyConversationSubtitle")}</p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                        <MessageCircle size={24} className="mx-auto text-[#2b59b0]" />
                        <p className="mt-3 text-sm font-semibold text-slate-700">{tt("noMessages")}</p>
                        <p className="mt-1 text-xs text-slate-500">{tt("startConversationWith", { name: selectedMember.name })}</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const mine = String(message?.sender_id || "") === currentUserId;
                      const senderName = mine
                        ? (currentUser?.name || tt("you"))
                        : selectedMember?.is_group
                          ? (memberByIdMap.get(String(message?.sender_id || ""))?.name || tt("member"))
                          : (selectedMember?.name || tt("member"));
                      const imageAttachment = message?.file_url && isImageMime(message?.file_mime_type, message?.file_name);
                      const stickerMessage = parseStickerMessage(message?.message);
                      const stickerOnly = Boolean(stickerMessage?.sticker) && !stickerMessage?.caption && !message?.file_url;

                      return (
                        <div
                          key={String(message?.id || `${message?.room_id}-${message?.created_at}`)}
                          className={`flex ${mine ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[88%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                            <div
                              className={`rounded-[1.4rem] px-4 py-3 shadow-sm ${
                                stickerOnly
                                  ? "bg-transparent px-0 py-0 shadow-none"
                                  : mine
                                    ? "bg-[#2b59b0] text-white"
                                    : "border border-slate-200 bg-white text-slate-800"
                              }`}
                            >
                              {!mine && (
                                <p className="mb-1 text-[11px] font-bold text-[#2b59b0]">{senderName}</p>
                              )}
                              {stickerMessage?.sticker ? (
                                <div className={message?.file_url ? "mb-3" : ""}>
                                  <div
                                    className={`inline-flex h-20 w-20 items-center justify-center rounded-[1.8rem] border text-[2.5rem] shadow-sm ${
                                      mine
                                        ? "border-white/20 bg-white/10"
                                        : "border-slate-200 bg-slate-50"
                                    }`}
                                  >
                                    <span role="img" aria-label={stickerLabel(stickerMessage.sticker.id)}>
                                      {stickerMessage.sticker.emoji}
                                    </span>
                                  </div>
                                  {stickerMessage.caption && (
                                    <p className={`mt-3 whitespace-pre-wrap text-sm leading-relaxed ${mine ? "text-white" : "text-slate-700"}`}>
                                      {stickerMessage.caption}
                                    </p>
                                  )}
                                </div>
                              ) : message?.message ? (
                                <p className={`whitespace-pre-wrap text-sm leading-relaxed ${mine ? "text-white" : "text-slate-700"}`}>
                                  {message.message}
                                </p>
                              ) : null}
                              {message?.file_url && imageAttachment && (
                                <button
                                  type="button"
                                  onClick={() => window.open(message.file_url, "_blank", "noopener,noreferrer")}
                                  className={`${message?.message ? "mt-3" : ""} block overflow-hidden rounded-2xl border border-black/10`}
                                >
                                  <img
                                    src={message.file_url}
                                    alt={message?.file_name || tt("sentImage")}
                                    className="max-h-64 w-full object-cover"
                                  />
                                </button>
                              )}
                              {message?.file_url && !imageAttachment && (
                                <a
                                  href={message.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`${message?.message ? "mt-3" : ""} flex items-center gap-3 rounded-2xl border border-black/10 bg-black/5 px-3 py-3 text-left`}
                                >
                                  <Paperclip size={16} className={mine ? "text-white" : "text-[#2b59b0]"} />
                                  <span className="min-w-0">
                                    <span className={`block truncate text-sm font-semibold ${mine ? "text-white" : "text-slate-800"}`}>
                                      {message?.file_name || tt("attachedFile")}
                                    </span>
                                    <span className={`block text-[11px] ${mine ? "text-blue-100" : "text-slate-500"}`}>
                                      {(message?.file_mime_type || "file").toUpperCase()}
                                    </span>
                                  </span>
                                </a>
                              )}
                            </div>
                            <div className={`mt-1 flex items-center gap-1 px-1 text-[11px] ${mine ? "text-slate-400" : "text-slate-500"}`}>
                              <span>{formatDateTime(message?.created_at, locale)}</span>
                              {mine && (
                                <>
                                  {message?.read_status ? (
                                    <CheckCheck size={12} className="text-emerald-500" />
                                  ) : (
                                    <Check size={12} className="text-slate-400" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {typingHintVisible && (
                  <div className={`absolute rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm ${isMobileViewport ? "bottom-3 left-3" : "bottom-3 left-4"}`}>
                    {tt("typing", { name: typingMemberName || tt("member") })}
                  </div>
                )}

                {dragActive && (
                  <div className="pointer-events-none absolute inset-4 flex items-center justify-center rounded-[1.8rem] border-2 border-dashed border-[#2b59b0]/35 bg-[#eef4ff]/90">
                    <div className="text-center">
                      <Paperclip size={22} className="mx-auto text-[#2b59b0]" />
                      <p className="mt-3 text-sm font-semibold text-slate-700">{tt("dropToAttach")}</p>
                      <p className="mt-1 text-xs text-slate-500">{tt("supportedAttachments")}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className={`shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur ${isMobileViewport ? "px-3 py-2.5" : "px-4 py-3"}`}>
                {notice && (
                  <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                    {notice}
                  </div>
                )}
                {error && (
                  <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    {error}
                  </div>
                )}

                {pendingFile && (
                  <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-3">
                      {pendingFilePreview ? (
                        <img
                          src={pendingFilePreview}
                          alt={pendingFile.name}
                          className={`${isMobileViewport ? "h-10 w-10" : "h-11 w-11"} rounded-2xl object-cover`}
                        />
                      ) : (
                          <div className={`flex items-center justify-center rounded-2xl bg-white text-[#2b59b0] ${isMobileViewport ? "h-10 w-10" : "h-11 w-11"}`}>
                            <ImageIcon size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{pendingFile.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {(pendingFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearPendingFile}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100"
                      aria-label={tt("removeAttachment")}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className={`flex items-center ${isMobileViewport ? "gap-1" : "gap-2"}`}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!selectedMember}
                    className={`inline-flex shrink-0 items-center justify-center border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 ${isMobileViewport ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl"}`}
                    aria-label={tt("attachFile")}
                  >
                    <Paperclip size={16} />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      handleIncomingFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      handleIncomingFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={!selectedMember}
                    className={`inline-flex shrink-0 items-center justify-center border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 ${isMobileViewport ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl"}`}
                    aria-label={tt("openCamera")}
                  >
                    <Camera size={16} />
                  </button>

                  <div className="relative shrink-0" ref={stickerPickerRef}>
                    <button
                      type="button"
                      onClick={() => setStickerPickerOpen((value) => !value)}
                      disabled={!selectedMember}
                      className={`inline-flex items-center justify-center border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 ${isMobileViewport ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl"}`}
                      aria-label={tt("openStickers")}
                    >
                      <Smile size={16} />
                    </button>

                    {stickerPickerOpen && (
                      <div className={`absolute z-10 rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)] ${isMobileViewport ? "bottom-12 right-0 w-[220px]" : "bottom-14 left-0 w-[240px]"}`}>
                        <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          {tt("stickersTitle")}
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {CHAT_STICKERS.map((sticker) => (
                            <button
                              key={sticker.id}
                              type="button"
                              onClick={() => handleStickerSelect(sticker.id)}
                              className="flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-2xl transition hover:-translate-y-0.5 hover:border-[#2b59b0]/25 hover:bg-[#eef4ff]"
                              title={stickerLabel(sticker.id)}
                              aria-label={stickerLabel(sticker.id)}
                            >
                              <span role="img" aria-hidden="true">
                                {sticker.emoji}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <textarea
                      rows={isMobileViewport ? 1 : 2}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      onPaste={handleComposerPaste}
                      placeholder={selectedMember ? tt("composerPlaceholder", { name: selectedMember.name }) : tt("chooseRoomFirst")}
                      disabled={!selectedMember}
                      className={`w-full resize-none border text-sm text-slate-700 focus:border-[#2b59b0] focus:outline-none focus:ring-2 focus:ring-[#2b59b0]/15 disabled:cursor-not-allowed disabled:bg-slate-50 ${isMobileViewport ? "min-h-9 max-h-24 rounded-xl border-slate-200 px-3 py-2 leading-5" : "rounded-[1.4rem] border-slate-300 px-4 py-3"}`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || (!normalizeText(draft) && !pendingFile) || !selectedMember}
                    className={`inline-flex shrink-0 items-center justify-center bg-[#2b59b0] text-white transition hover:bg-[#244a95] disabled:cursor-not-allowed disabled:bg-slate-300 ${isMobileViewport ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl"}`}
                    aria-label={tt("sendMessage")}
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </section>
          </div>
          {isCreateGroupOpen ? (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/35 p-3"
              onClick={() => {
                if (creatingGroup) return;
                setIsCreateGroupOpen(false);
              }}
            >
              <div
                className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.5)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{tt("newGroup")}</p>
                    <h4 className="mt-1 text-sm font-black text-slate-900">{tt("createGroupTitle")}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateGroupOpen(false)}
                    disabled={creatingGroup}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    aria-label={tt("closeCreateGroup")}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-500">{tt("groupNameOptional")}</label>
                    <input
                      type="text"
                      value={groupNameDraft}
                      onChange={(event) => setGroupNameDraft(event.target.value)}
                      placeholder={tt("groupNameExample")}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#2b59b0] focus:outline-none focus:ring-2 focus:ring-[#2b59b0]/15"
                    />
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-slate-500">{tt("members")}</p>
                    <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                      {directoryMembers.length === 0 ? (
                        <p className="px-2 py-2 text-xs text-slate-400">{tt("noMembersToSelect")}</p>
                      ) : (
                        directoryMembers.map((member) => {
                          const checked = groupMemberIds.includes(String(member.id));
                          return (
                            <label key={`create-group-member-${member.id}`} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => toggleGroupMemberSelection(member.id, event.target.checked)}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                              <span className="min-w-0 flex-1 truncate">{member.name}</span>
                              <span className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{roleLabel(member.role, roleLabels)}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    {tt("selectedMembers", { count: groupMemberIds.length + 1 })}
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateGroup}
                    disabled={creatingGroup || groupMemberIds.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2b59b0] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#244a95] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {creatingGroup ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    {tt("create")}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {isEditGroupOpen ? (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/35 p-3"
              onClick={() => {
                if (savingGroupSettings || deletingGroup) return;
                setIsEditGroupOpen(false);
                resetEditGroupForm();
              }}
            >
              <div
                className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.5)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{tt("groupSettings")}</p>
                    <h4 className="mt-1 text-sm font-black text-slate-900">{tt("manageGroup")}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditGroupOpen(false);
                      resetEditGroupForm();
                    }}
                    disabled={savingGroupSettings || deletingGroup}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    aria-label={tt("closeGroupSettings")}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-4 p-4">
                  <div className="flex items-center gap-4">
                    {editingGroupAvatarPreview || editingGroupAvatarUrl ? (
                      <img
                        src={editingGroupAvatarPreview || editingGroupAvatarUrl}
                        alt={editingGroupName || tt("groupChat")}
                        onError={(event) => {
                          event.currentTarget.src = buildAvatarFallback(editingGroupName || tt("groupChat"), "2b59b0");
                        }}
                        className="h-16 w-16 rounded-2xl border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-[#2b59b0]">
                        <Users size={20} />
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => editGroupAvatarInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Camera size={14} />
                        {tt("groupPhoto")}
                      </button>
                      {(editingGroupAvatarPreview || editingGroupAvatarUrl) ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (editingGroupAvatarPreview) {
                              URL.revokeObjectURL(editingGroupAvatarPreview);
                            }
                            setEditingGroupAvatarPreview("");
                            setEditingGroupAvatarFile(null);
                            setEditingGroupAvatarUrl("");
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 size={14} />
                          {tt("removePhoto")}
                        </button>
                      ) : null}
                      <input
                        ref={editGroupAvatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          handleEditGroupAvatarSelection(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-500">{tt("groupName")}</label>
                    <input
                      type="text"
                      value={editingGroupName}
                      onChange={(event) => setEditingGroupName(event.target.value)}
                      placeholder={tt("groupNamePlaceholder")}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#2b59b0] focus:outline-none focus:ring-2 focus:ring-[#2b59b0]/15"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                    {tt("groupManagementHint")}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
                  <button
                    type="button"
                    onClick={handleDeleteGroup}
                    disabled={savingGroupSettings || deletingGroup}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingGroup ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {tt("deleteGroup")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveGroupSettings}
                    disabled={savingGroupSettings || deletingGroup}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2b59b0] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#244a95] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {savingGroupSettings ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                    {tt("saveChanges")}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex w-full items-center justify-between bg-white px-4 py-3 text-left"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{tt("collapsed")}</p>
              <p className="truncate text-sm font-semibold text-slate-800">{tt("tapToExpand")}</p>
            </div>
            <MessageCircle size={16} className="text-[#2b59b0]" />
          </button>
        )}
      </div>
    </div>
  );
}



