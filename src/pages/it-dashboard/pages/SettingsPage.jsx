import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BadgeInfo,
  Briefcase,
  Building2,
  Camera,
  CheckCircle,
  Clock3,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { useScopedI18n } from "../../../i18n/useScopedI18n";
import {
  ACCOUNT_ROLE_OPTIONS,
  PASSWORD_MIN_LENGTH,
  PROFILE_AVATAR_MAX_SIZE_BYTES,
  createManagedAccount,
  createProfileForm,
  deleteManagedProfileRecord,
  fetchAccountCenterData,
  normalizeRole,
  normalizeText,
  removeManagedAccountAvatar,
  sendManagedPasswordReset,
  setManagedAccountPassword,
  updateManagedAccount,
  updateMemberAccessState,
  updateSelfAccount,
  uploadManagedAccountAvatar,
} from "../services/accountCenterService";

const ROLE_META = {
  user: { label: "User", chip: "border-slate-300 bg-slate-100 text-slate-700" },
  it_support: { label: "IT Support", chip: "border-[#2b59b0]/25 bg-[#2b59b0]/10 text-[#2b59b0]" },
  it_manager: { label: "IT Manager", chip: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  executive: { label: "Executive", chip: "border-violet-200 bg-violet-50 text-violet-700" },
  auditor: { label: "Auditor", chip: "border-amber-200 bg-amber-50 text-amber-700" },
  admin: { label: "Admin", chip: "border-rose-200 bg-rose-50 text-rose-700" },
};

const SETTINGS_PAGE_TRANSLATIONS = {
  th: {
    statusOptions: {
      all: "สิทธิ์ทั้งหมด",
      active: "ใช้งานได้",
      inactive: "พักสิทธิ์",
      online: "ออนไลน์",
    },
    header: {
      eyebrow: "ศูนย์จัดการบัญชี",
      title: "จัดการสิทธิ์ โปรไฟล์ และบัญชีพนักงานทั้งหมด",
      subtitle: "สร้างบัญชี ปรับบทบาท อัปโหลดรูปโปรไฟล์ พักสิทธิ์ และส่งลิงก์กู้รหัสผ่านได้จากพื้นที่ทำงานเดียว",
      createAccount: "สร้างบัญชี",
      refresh: "รีเฟรช",
    },
    stats: {
      members: "สมาชิก",
      totalProfileRecords: "จำนวนโปรไฟล์ทั้งหมด",
      active: "ใช้งานได้",
      allowedToSignIn: "อนุญาตให้เข้าสู่ระบบ",
      paused: "พักสิทธิ์",
      blockedFromRoutes: "ถูกกันจากหน้าที่ต้องมีสิทธิ์",
      online: "ออนไลน์",
      recentPresence: "กิจกรรมล่าสุดของผู้ใช้",
    },
    directory: {
      eyebrow: "รายชื่อสมาชิก",
      title: "ค้นหาบัญชีและเปิดหน้าแก้ไขเต็มรูปแบบ",
      searchPlaceholder: "ค้นหาชื่อ อีเมล แผนก...",
      allRoles: "ทุกบทบาท",
      noMembersTitle: "ไม่พบสมาชิกตามตัวกรองนี้",
      noMembersHint: "ปรับตัวกรองหรือสร้างบัญชีใหม่",
    },
    chips: {
      activeAccess: "เปิดใช้งาน",
      pausedAccess: "พักสิทธิ์",
      you: "คุณ",
      currentSession: "เซสชันปัจจุบัน",
    },
    memberMeta: {
      department: "แผนก",
      position: "ตำแหน่ง",
      employee: "รหัสพนักงาน",
      presence: "สถานะ",
      onlineNow: "ออนไลน์อยู่",
      noActivity: "ยังไม่มีกิจกรรม",
    },
    selected: {
      eyebrow: "สมาชิกที่เลือก",
      noEmail: "ไม่มีอีเมล",
      presence: "สถานะ",
      accessPaused: "พักสิทธิ์อยู่",
      noRecentActivity: "ยังไม่มีกิจกรรมล่าสุด",
      changePhoto: "เปลี่ยนรูป",
      removePhoto: "ลบรูป",
      sendResetLink: "ส่งลิงก์รีเซ็ตรหัสผ่าน",
      pauseAccess: "พักสิทธิ์",
      restoreAccess: "เปิดสิทธิ์กลับ",
    },
    password: {
      setPassword: "ตั้งรหัสผ่าน",
      setNewPasswordTitle: "ตั้งรหัสผ่านใหม่ให้สมาชิกนี้",
      setNewPasswordHint: "ระบบจะเปลี่ยนรหัสผ่านทันที ให้ผู้ใช้เข้าสู่ระบบใหม่ด้วยรหัสผ่านนี้",
      useSecurityPanel: "ใช้แผงความปลอดภัยเพื่อเปลี่ยนรหัสผ่านของตัวเอง",
      newPassword: "รหัสผ่านใหม่",
      confirmPassword: "ยืนยันรหัสผ่าน",
      minimumChars: "อย่างน้อย {{count}} ตัวอักษร",
      setPasswordNow: "ตั้งรหัสผ่านตอนนี้",
    },
    self: {
      myAccount: "บัญชีของฉัน",
      updateProfile: "อัปเดตโปรไฟล์พื้นที่ทำงาน",
      changePhoto: "เปลี่ยนรูป",
      removePhoto: "ลบรูป",
      currentRole: "บทบาทปัจจุบัน",
      syncHint: "การแก้ไขโปรไฟล์จะซิงก์ไปยังข้อมูลโปรไฟล์และ auth metadata",
      saveProfile: "บันทึกโปรไฟล์",
      security: "ความปลอดภัย",
      changePassword: "เปลี่ยนรหัสผ่านของคุณ",
      sessionPolicy: "นโยบายรหัสผ่าน",
      updatePassword: "อัปเดตรหัสผ่าน",
    },
    common: {
      unnamedMember: "สมาชิกไม่มีชื่อ",
      noEmail: "ไม่มีอีเมล",
      noMembers: "ไม่มีสมาชิก",
      noActivity: "ยังไม่มีกิจกรรม",
    },
  },
  en: {
    statusOptions: {
      all: "All access",
      active: "Active",
      inactive: "Paused",
      online: "Online",
    },
    header: {
      eyebrow: "Account Center",
      title: "Manage access, profiles, and every member account",
      subtitle: "Create accounts, adjust roles, upload profile images, pause access, and trigger password recovery from one responsive workspace.",
      createAccount: "Create account",
      refresh: "Refresh",
    },
    stats: {
      members: "Members",
      totalProfileRecords: "Total profile records",
      active: "Active",
      allowedToSignIn: "Allowed to sign in",
      paused: "Paused",
      blockedFromRoutes: "Blocked from protected routes",
      online: "Online",
      recentPresence: "Recent presence activity",
    },
    directory: {
      eyebrow: "Member Directory",
      title: "Search every account and open a full editor",
      searchPlaceholder: "Search by name, email, department...",
      allRoles: "All roles",
      noMembersTitle: "No members match this filter",
      noMembersHint: "Adjust the filters or create a new account.",
    },
    chips: {
      activeAccess: "Active access",
      pausedAccess: "Paused access",
      you: "You",
      currentSession: "Current session",
    },
    memberMeta: {
      department: "Department",
      position: "Position",
      employee: "Employee",
      presence: "Presence",
      onlineNow: "Online now",
      noActivity: "No activity",
    },
    selected: {
      eyebrow: "Selected Member",
      noEmail: "No email",
      presence: "Presence",
      accessPaused: "Access paused",
      noRecentActivity: "No recent activity",
      changePhoto: "Change photo",
      removePhoto: "Remove photo",
      sendResetLink: "Send reset link",
      pauseAccess: "Pause access",
      restoreAccess: "Restore access",
    },
    password: {
      setPassword: "Set Password",
      setNewPasswordTitle: "Set a new password for this member",
      setNewPasswordHint: "This updates the account password immediately. Ask the user to sign in again with the new password.",
      useSecurityPanel: "Use the Security panel to change your own password.",
      newPassword: "New Password",
      confirmPassword: "Confirm Password",
      minimumChars: "Minimum {{count}} characters",
      setPasswordNow: "Set password now",
    },
    self: {
      myAccount: "My Account",
      updateProfile: "Update your workspace profile",
      changePhoto: "Change photo",
      removePhoto: "Remove photo",
      currentRole: "Current role",
      syncHint: "Profile edits sync to the profile record and auth metadata.",
      saveProfile: "Save profile",
      security: "Security",
      changePassword: "Change your password here",
      sessionPolicy: "Session policy",
      updatePassword: "Update password",
    },
    common: {
      unnamedMember: "Unnamed member",
      noEmail: "No email",
      noMembers: "No members",
      noActivity: "No activity",
    },
  },
  ko: {
    statusOptions: {
      all: "전체 접근",
      active: "활성",
      inactive: "중지",
      online: "온라인",
    },
    header: {
      eyebrow: "계정 센터",
      title: "권한, 프로필, 전체 구성원 계정 관리",
      subtitle: "계정 생성, 역할 조정, 프로필 이미지 업로드, 접근 중지, 비밀번호 복구를 한 화면에서 관리합니다.",
      createAccount: "계정 생성",
      refresh: "새로고침",
    },
    stats: {
      members: "구성원",
      totalProfileRecords: "전체 프로필",
      active: "활성",
      allowedToSignIn: "로그인 허용",
      paused: "중지",
      blockedFromRoutes: "보호된 화면 접근 차단",
      online: "온라인",
      recentPresence: "최근 활동",
    },
    directory: {
      eyebrow: "구성원 목록",
      title: "계정을 검색하고 전체 편집기를 엽니다",
      searchPlaceholder: "이름, 이메일, 부서 검색...",
      allRoles: "전체 역할",
      noMembersTitle: "조건에 맞는 구성원이 없습니다",
      noMembersHint: "필터를 조정하거나 새 계정을 만드세요.",
    },
    chips: {
      activeAccess: "활성 접근",
      pausedAccess: "접근 중지",
      you: "나",
      currentSession: "현재 세션",
    },
    memberMeta: {
      department: "부서",
      position: "직책",
      employee: "사번",
      presence: "상태",
      onlineNow: "온라인",
      noActivity: "활동 없음",
    },
    selected: {
      eyebrow: "선택된 구성원",
      noEmail: "이메일 없음",
      presence: "상태",
      accessPaused: "접근 중지됨",
      noRecentActivity: "최근 활동 없음",
      changePhoto: "사진 변경",
      removePhoto: "사진 삭제",
      sendResetLink: "재설정 링크 보내기",
      pauseAccess: "접근 중지",
      restoreAccess: "접근 복구",
    },
    password: {
      setPassword: "비밀번호 설정",
      setNewPasswordTitle: "이 구성원의 새 비밀번호 설정",
      setNewPasswordHint: "계정 비밀번호가 즉시 변경됩니다. 사용자에게 새 비밀번호로 다시 로그인하도록 안내하세요.",
      useSecurityPanel: "본인 비밀번호는 보안 패널에서 변경하세요.",
      newPassword: "새 비밀번호",
      confirmPassword: "비밀번호 확인",
      minimumChars: "최소 {{count}}자",
      setPasswordNow: "지금 비밀번호 설정",
    },
    self: {
      myAccount: "내 계정",
      updateProfile: "워크스페이스 프로필 업데이트",
      changePhoto: "사진 변경",
      removePhoto: "사진 삭제",
      currentRole: "현재 역할",
      syncHint: "프로필 수정 사항은 프로필 레코드와 인증 메타데이터에 동기화됩니다.",
      saveProfile: "프로필 저장",
      security: "보안",
      changePassword: "비밀번호 변경",
      sessionPolicy: "세션 정책",
      updatePassword: "비밀번호 업데이트",
    },
    common: {
      unnamedMember: "이름 없는 구성원",
      noEmail: "이메일 없음",
      noMembers: "구성원 없음",
      noActivity: "활동 없음",
    },
  },
};

const SETTINGS_CREATE_TRANSLATIONS = {
  th: {
    eyebrow: "บัญชีที่จัดการใหม่",
    title: "สร้างบัญชีพนักงานพร้อมรูปโปรไฟล์และสิทธิ์การเข้าถึง",
    close: "ปิด",
    profileImage: "รูปโปรไฟล์",
    imageHint: "PNG, JPG หรือ WebP ขนาดไม่เกิน 3 MB",
    chooseImage: "เลือกรูป",
    removeImage: "ลบรูป",
    identityAccess: "ข้อมูลตัวตนและสิทธิ์",
    fullName: "ชื่อ-นามสกุล",
    email: "อีเมล",
    employeeCode: "รหัสพนักงาน",
    role: "บทบาท",
    temporaryPassword: "รหัสผ่านชั่วคราว",
    confirmPassword: "ยืนยันรหัสผ่าน",
    workProfile: "ข้อมูลการทำงาน",
    firstNameEn: "ชื่อภาษาอังกฤษ",
    lastNameEn: "นามสกุลภาษาอังกฤษ",
    department: "แผนก",
    position: "ตำแหน่ง",
    phone: "เบอร์โทร",
    location: "สถานที่ทำงาน",
    footerHint: "ถ้า Supabase เปิดการยืนยันอีเมล ผู้ใช้อาจต้องยืนยันอีเมลก่อนเข้าสู่ระบบครั้งแรก",
    submit: "สร้างบัญชีพนักงาน",
    newMember: "สมาชิกใหม่",
  },
  en: {
    eyebrow: "New Managed Account",
    title: "Create a member account with profile image and access role",
    close: "Close",
    profileImage: "Profile image",
    imageHint: "PNG, JPG, or WebP up to 3 MB",
    chooseImage: "Choose image",
    removeImage: "Remove image",
    identityAccess: "Identity and access",
    fullName: "Full Name",
    email: "Email",
    employeeCode: "Employee Code",
    role: "Role",
    temporaryPassword: "Temporary Password",
    confirmPassword: "Confirm Password",
    workProfile: "Work profile",
    firstNameEn: "First Name EN",
    lastNameEn: "Last Name EN",
    department: "Department",
    position: "Position",
    phone: "Phone",
    location: "Location",
    footerHint: "If email confirmation is enabled in Supabase, the user may still need to verify their mailbox before first sign-in.",
    submit: "Create member account",
    newMember: "New member",
  },
  ko: {
    eyebrow: "새 관리 계정",
    title: "프로필 이미지와 접근 역할이 있는 구성원 계정 생성",
    close: "닫기",
    profileImage: "프로필 이미지",
    imageHint: "PNG, JPG 또는 WebP, 최대 3 MB",
    chooseImage: "이미지 선택",
    removeImage: "이미지 삭제",
    identityAccess: "신원 및 접근 권한",
    fullName: "이름",
    email: "이메일",
    employeeCode: "사번",
    role: "역할",
    temporaryPassword: "임시 비밀번호",
    confirmPassword: "비밀번호 확인",
    workProfile: "근무 프로필",
    firstNameEn: "영문 이름",
    lastNameEn: "영문 성",
    department: "부서",
    position: "직책",
    phone: "전화번호",
    location: "근무 위치",
    footerHint: "Supabase 이메일 확인이 활성화된 경우 첫 로그인 전에 메일 인증이 필요할 수 있습니다.",
    submit: "구성원 계정 생성",
    newMember: "새 구성원",
  },
};

const SETTINGS_PAGE_I18N = {
  th: { ...SETTINGS_PAGE_TRANSLATIONS.th, create: SETTINGS_CREATE_TRANSLATIONS.th },
  en: { ...SETTINGS_PAGE_TRANSLATIONS.en, create: SETTINGS_CREATE_TRANSLATIONS.en },
  ko: { ...SETTINGS_PAGE_TRANSLATIONS.ko, create: SETTINGS_CREATE_TRANSLATIONS.ko },
};

const baseChipDark = "dark:border-white/10 dark:bg-white/5 dark:text-slate-100";
const activeChip =
  "border-[#2b59b0]/20 bg-[#2b59b0]/10 text-[#2b59b0] dark:border-[#5f86d8]/40 dark:bg-[#2b59b0]/20 dark:text-[#dbe7ff]";
const pausedChip =
  "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name) {
  const parts = normalizeText(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getRoleMeta(role) {
  return ROLE_META[normalizeRole(role)] || ROLE_META.user;
}

function createNewMemberForm() {
  return { ...createProfileForm({ role: "user", is_active: true }), email: "", nextPassword: "", confirmPassword: "" };
}

function Avatar({ src, name, size = "h-14 w-14", text = "text-base" }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img src={src} alt={name || "Avatar"} onError={() => setFailed(true)} className={`${size} rounded-[1.35rem] object-cover`} />
  ) : (
    <div className={`flex ${size} items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-[#2b59b0] via-[#1f7a8c] to-[#0f766e] font-black text-white ${text}`}>
      {getInitials(name)}
    </div>
  );
}

function Field({ icon: Icon, label, hint = "", children }) {
  return (
    <label className="block">
      <span className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {Icon ? <Icon size={13} /> : null}
        {label}
      </span>
      {children}
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </label>
  );
}

export default function SettingsPage({ theme = "light", uiTheme: dashboardUiTheme = {}, currentUser, onCurrentUserUpdate }) {
  const isDarkTheme = theme === "dark";
  const uiTheme = {
    ...dashboardUiTheme,
    surfaceCard: isDarkTheme ? "border-slate-700 bg-[#0f172a]" : "border-[#c8d8f2] bg-white",
    statusButton: isDarkTheme
      ? "border-slate-600 bg-[#162136] text-slate-100 hover:border-[#5f86d8] hover:bg-[#1b2b49]"
      : "border-[#2b59b0]/25 bg-white text-[#2b59b0] hover:border-[#2b59b0]/40 hover:bg-[#eff5ff]",
    textPrimary: isDarkTheme ? "text-slate-100" : "text-slate-950",
    textSecondary: isDarkTheme ? "text-slate-300" : "text-slate-600",
    textMuted: isDarkTheme ? "text-slate-400" : "text-slate-500",
    textSubtle: isDarkTheme ? "text-slate-500" : "text-slate-400",
    searchInputMobile:
      isDarkTheme
        ? "bg-[#111b2d] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#7aa2ff] focus:ring-2 focus:ring-[#2b59b0]/25"
        : "bg-white border-[#c8d8f2] text-slate-900 placeholder-slate-400 focus:border-[#2b59b0] focus:ring-2 focus:ring-[#2b59b0]/10",
  };
  const { tt } = useScopedI18n(SETTINGS_PAGE_I18N);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSelf, setSavingSelf] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [savingManagedPassword, setSavingManagedPassword] = useState(false);
  const [creatingMember, setCreatingMember] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sessionUser, setSessionUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selfForm, setSelfForm] = useState(createProfileForm(currentUser));
  const [memberForm, setMemberForm] = useState(createProfileForm());
  const [passwordForm, setPasswordForm] = useState({ nextPassword: "", confirmPassword: "" });
  const [managedPasswordForm, setManagedPasswordForm] = useState({ nextPassword: "", confirmPassword: "" });
  const [createForm, setCreateForm] = useState(createNewMemberForm());
  const [createAvatarFile, setCreateAvatarFile] = useState(null);
  const [createAvatarPreview, setCreateAvatarPreview] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const deferredSearch = useDeferredValue(searchQuery);
  const selfAvatarRef = useRef(null);
  const memberAvatarRef = useRef(null);
  const createAvatarRef = useRef(null);
  const canHardDelete = normalizeRole(currentUser?.role) === "admin";
  const statusOptions = useMemo(() => [
    { value: "all", label: tt("statusOptions.all") },
    { value: "active", label: tt("statusOptions.active") },
    { value: "inactive", label: tt("statusOptions.inactive") },
    { value: "online", label: tt("statusOptions.online") },
  ], [tt]);
  const cardClass = `rounded-[1.9rem] border ${isDarkTheme ? "shadow-[0_24px_70px_-42px_rgba(2,6,23,0.9)] ring-1 ring-white/5" : "shadow-[0_24px_70px_-42px_rgba(43,89,176,0.45)] ring-1 ring-white/80"} ${uiTheme.surfaceCard}`;
  const subCardClass = isDarkTheme ? "border-slate-700 bg-[#111b2d]/92" : "border-[#c8d8f2] bg-white";
  const inputClass =
    theme === "dark"
      ? "w-full rounded-2xl border border-slate-700 bg-[#111b2d] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#7aa2ff] focus:ring-2 focus:ring-[#2b59b0]/25"
      : "w-full rounded-2xl border border-[#d8e4f8] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2b59b0] focus:ring-2 focus:ring-[#2b59b0]/10";
  const readOnlyInputClass =
    theme === "dark" ? `${inputClass} cursor-not-allowed bg-slate-800 text-slate-400` : `${inputClass} cursor-not-allowed bg-slate-100 text-slate-500`;
  const secondaryButton = `inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${uiTheme.statusButton}`;
  const ghostButton =
    theme === "dark"
      ? "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-[#111b2d] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-[#5f86d8] hover:bg-[#162136] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:hover:border-slate-700 disabled:hover:bg-slate-800"
      : "inline-flex items-center justify-center gap-2 rounded-2xl border border-[#c8d8f2] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#2b59b0]/30 hover:bg-[#f4f8ff] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:border-slate-200 disabled:hover:bg-slate-100";
  const primaryButton =
    theme === "dark"
      ? "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2b59b0] px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-[#2b59b0]/25 transition hover:bg-[#244a95] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none disabled:hover:bg-slate-800"
      : "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2b59b0] px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-[#2b59b0]/25 transition hover:bg-[#244a95] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:hover:bg-slate-200";
  const actionSecondaryButton =
    theme === "dark"
      ? `${secondaryButton} disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:hover:border-slate-700 disabled:hover:bg-slate-800`
      : `${secondaryButton} disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:border-slate-200 disabled:hover:bg-slate-100`;
  const dangerButton =
    theme === "dark"
      ? "inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:hover:bg-slate-800"
      : "inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:bg-slate-100";
  const heroClass = isDarkTheme
    ? "bg-[linear-gradient(135deg,#111827_0%,#0f172a_58%,#13264a_100%)]"
    : "bg-[linear-gradient(135deg,#ffffff_0%,#f9fbff_58%,#eef5ff_100%)]";
  const heroGlowClass = isDarkTheme
    ? "from-[#2b59b0]/25 via-cyan-400/10 to-transparent"
    : "from-[#2b59b0]/18 via-sky-300/12 to-transparent";
  const heroEyebrowClass = isDarkTheme ? "text-[#9bbcff]" : "text-[#2b59b0]";
  const heroTitleClass = isDarkTheme ? "text-slate-100" : "text-slate-950";
  const heroSubtitleClass = isDarkTheme ? "text-slate-300" : "text-slate-600";
  const statLabelClass = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const dividerClass = isDarkTheme ? "border-slate-700" : "border-[#c8d8f2]";

  const syncCurrentUser = (profile) => {
    onCurrentUserUpdate?.({
      name: profile.full_name || currentUser?.name || "",
      email: profile.email || currentUser?.email || "",
      employeeId: profile.employee_code || currentUser?.employeeId || "",
      department: profile.department || currentUser?.department || "",
      position: profile.position || currentUser?.position || "",
      phone: profile.phone || currentUser?.phone || "",
      location: profile.location || currentUser?.location || "",
      avatar: profile.avatar_url || profile.id_card_url || currentUser?.avatar || "",
      role: profile.role || currentUser?.role || "",
      isActive: profile.is_active !== false,
    });
  };

  const resetCreate = () => {
    if (createAvatarPreview) URL.revokeObjectURL(createAvatarPreview);
    setCreateAvatarFile(null);
    setCreateAvatarPreview("");
    setCreateForm(createNewMemberForm());
    setCreateOpen(false);
  };

  const loadData = async ({ silent = false, preferredSelectedId = "" } = {}) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      setErrorMessage("");
      const result = await fetchAccountCenterData(currentUser);
      const rows = Array.isArray(result.members) ? result.members : [];
      setSessionUser(result.sessionUser);
      setCurrentUserId(result.currentUserId);
      setMembers(rows);
      setSelfForm(createProfileForm(result.ownProfile));
      setSelectedMemberId((prev) => {
        const preferred = normalizeText(preferredSelectedId);
        if (preferred && rows.some((item) => normalizeText(item?.id) === preferred)) return preferred;
        if (prev && rows.some((item) => normalizeText(item?.id) === normalizeText(prev))) return prev;
        return normalizeText(result.ownProfile?.id || rows[0]?.id);
      });
      syncCurrentUser(result.ownProfile);
    } catch (error) {
      console.error("Load account center error:", error);
      setMembers([]);
      setErrorMessage(error.message || "Unable to load account center.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => () => {
    if (createAvatarPreview) URL.revokeObjectURL(createAvatarPreview);
  }, [createAvatarPreview]);

  const selectedMember = useMemo(
    () => members.find((item) => normalizeText(item?.id) === normalizeText(selectedMemberId)) || null,
    [members, selectedMemberId],
  );
  const isSelectedCurrentUser = normalizeText(selectedMember?.id) === currentUserId;
  const hasSelectedMemberAvatar = Boolean(memberForm.avatar_url || selectedMember?.avatar_url);

  useEffect(() => {
    setMemberForm(createProfileForm(selectedMember));
  }, [selectedMember]);

  useEffect(() => {
    setManagedPasswordForm({ nextPassword: "", confirmPassword: "" });
  }, [selectedMember?.id]);

  const summary = useMemo(() => {
    const active = members.filter((item) => item?.is_active !== false);
    return {
      total: members.length,
      active: active.length,
      paused: members.filter((item) => item?.is_active === false).length,
      admins: members.filter((item) => normalizeRole(item?.role) === "admin").length,
      online: active.filter((item) => normalizeText(item?.status) === "online").length,
    };
  }, [members]);

  const filteredMembers = useMemo(() => {
    const keyword = normalizeText(deferredSearch).toLowerCase();
    return members.filter((member) => {
      if (roleFilter !== "all" && normalizeRole(member?.role) !== roleFilter) return false;
      if (statusFilter === "active" && member?.is_active === false) return false;
      if (statusFilter === "inactive" && member?.is_active !== false) return false;
      if (statusFilter === "online" && normalizeText(member?.status) !== "online") return false;
      if (!keyword) return true;
      return [member.full_name, member.email, member.employee_code, member.department, member.position, member.location, member.role]
        .map((value) => normalizeText(value).toLowerCase())
        .join(" ")
        .includes(keyword);
    });
  }, [deferredSearch, members, roleFilter, statusFilter]);

  const mutateAvatar = async ({ scope, file, clear = false }) => {
    const isSelf = scope === "self";
    const targetId = isSelf ? currentUserId : normalizeText(selectedMember?.id);
    if (!targetId || (!file && !clear)) return;
    try {
      setAvatarBusy(scope);
      setErrorMessage("");
      setSuccessMessage("");
      const formState = isSelf ? selfForm : memberForm;
      const targetEmail = isSelf ? selfForm.email : selectedMember?.email;
      const savedProfile = clear
        ? isSelf
          ? await updateSelfAccount(sessionUser, currentUser?.role, { ...selfForm, avatar_url: "" })
          : await removeManagedAccountAvatar(targetId, targetEmail, formState)
        : isSelf
          ? await updateSelfAccount(sessionUser, currentUser?.role, {
            ...selfForm,
            avatar_url: await uploadManagedAccountAvatar(targetId, file, formState.avatar_url),
          })
          : await updateManagedAccount(targetId, targetEmail, {
            ...memberForm,
            avatar_url: await uploadManagedAccountAvatar(targetId, file, formState.avatar_url),
          });
      if (normalizeText(savedProfile?.id) === currentUserId) {
        setSelfForm(createProfileForm(savedProfile));
        syncCurrentUser(savedProfile);
      }
      if (!isSelf) setMemberForm(createProfileForm(savedProfile));
      setSuccessMessage(clear ? "Profile image removed." : "Profile image updated.");
      await loadData({ silent: true, preferredSelectedId: targetId });
    } catch (error) {
      console.error("Avatar update error:", error);
      setErrorMessage(error.message || "Unable to update the profile image.");
    } finally {
      setAvatarBusy("");
    }
  };

  const confirmMemberAction = async (intent) => {
    if (!selectedMember?.id) return;
    if (intent === "delete" && !canHardDelete) return;
    const confirmed = window.confirm(
      intent === "delete"
        ? "Delete this profile record from the application directory?"
        : intent === "pause"
          ? "Pause sign-in access for this account?"
          : "Restore sign-in access for this account?",
    );
    if (!confirmed) return;
    try {
      setErrorMessage("");
      setSuccessMessage("");
      if (intent === "delete") {
        await deleteManagedProfileRecord(selectedMember);
        setSuccessMessage("Profile record deleted from the application directory.");
        await loadData({ silent: true, preferredSelectedId: currentUserId });
        return;
      }
      await updateMemberAccessState(selectedMember.id, intent === "restore");
      setSuccessMessage(intent === "restore" ? "Account access restored." : "Account access paused.");
      await loadData({ silent: true, preferredSelectedId: selectedMember.id });
    } catch (error) {
      console.error("Member action error:", error);
      setErrorMessage(error.message || "Unable to update account access.");
    }
  };

  const handleSetManagedPassword = async () => {
    if (!selectedMember?.id) return;

    if (isSelectedCurrentUser) {
      setErrorMessage("Use the Security panel to change your own password.");
      setSuccessMessage("");
      return;
    }

    try {
      if (managedPasswordForm.nextPassword.length < PASSWORD_MIN_LENGTH) {
        throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      }
      if (managedPasswordForm.nextPassword !== managedPasswordForm.confirmPassword) {
        throw new Error("Password confirmation does not match.");
      }

      setSavingManagedPassword(true);
      setErrorMessage("");
      setSuccessMessage("");
      await setManagedAccountPassword(selectedMember.id, managedPasswordForm.nextPassword);
      setManagedPasswordForm({ nextPassword: "", confirmPassword: "" });
      setSuccessMessage(`Password for ${selectedMember.email || selectedMember.full_name || "selected member"} has been updated.`);
    } catch (error) {
      console.error("Set managed password error:", error);
      setErrorMessage(error.message || "Unable to update this member password.");
    } finally {
      setSavingManagedPassword(false);
    }
  };

  if (loading) {
    return (
      <section className={`${cardClass} p-10 text-center`}>
        <Loader2 size={20} className="mx-auto animate-spin text-[#2b59b0]" />
        <p className={`mt-3 text-sm ${uiTheme.textSecondary}`}>Loading account center...</p>
      </section>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <section className={`${cardClass} ${heroClass} relative overflow-hidden px-5 py-5 sm:px-6`}>
          <div className={`absolute inset-y-0 right-0 w-72 bg-gradient-to-l ${heroGlowClass} blur-2xl`} />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className={`text-[11px] font-black uppercase tracking-[0.22em] ${heroEyebrowClass}`}>{tt("header.eyebrow")}</p>
              <h2 className={`mt-2 text-3xl font-black tracking-tight ${heroTitleClass}`}>{tt("header.title")}</h2>
              <p className={`mt-3 max-w-2xl text-sm font-medium leading-6 ${heroSubtitleClass}`}>{tt("header.subtitle")}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setCreateOpen(true)} className={primaryButton}><UserPlus size={16} />{tt("header.createAccount")}</button>
              <button type="button" onClick={() => void loadData({ silent: true })} className={secondaryButton}><RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />{tt("header.refresh")}</button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: tt("stats.members"), value: summary.total, hint: tt("stats.totalProfileRecords"), icon: Users, valueClass: isDarkTheme ? "text-[#9bbcff]" : "text-[#2b59b0]", iconClass: isDarkTheme ? "bg-[#2b59b0]/20 text-[#bcd0ff]" : "bg-[#2b59b0]/12 text-[#2b59b0]" },
              { label: tt("stats.active"), value: summary.active, hint: tt("stats.allowedToSignIn"), icon: CheckCircle, valueClass: isDarkTheme ? "text-[#9bbcff]" : "text-[#2b59b0]", iconClass: isDarkTheme ? "bg-[#2b59b0]/20 text-[#bcd0ff]" : "bg-[#2b59b0]/12 text-[#2b59b0]" },
              { label: tt("stats.paused"), value: summary.paused, hint: tt("stats.blockedFromRoutes"), icon: Power, valueClass: isDarkTheme ? "text-amber-300" : "text-amber-600", iconClass: isDarkTheme ? "bg-amber-500/15 text-amber-300" : "bg-amber-50 text-amber-600" },
              { label: tt("stats.online"), value: summary.online, hint: tt("stats.recentPresence"), icon: Activity, valueClass: isDarkTheme ? "text-sky-300" : "text-sky-600", iconClass: isDarkTheme ? "bg-sky-500/15 text-sky-300" : "bg-sky-50 text-sky-600" },
            ].map((item) => (
              <article key={item.label} className={`rounded-[1.45rem] border p-4 shadow-sm shadow-[#2b59b0]/5 ${subCardClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${statLabelClass}`}>{item.label}</p>
                    <p className={`mt-3 text-3xl font-black ${item.valueClass}`}>{item.value}</p>
                    <p className="mt-2 text-xs text-slate-500">{item.hint}</p>
                  </div>
                  <div className={`rounded-2xl p-3 ${item.iconClass}`}><item.icon size={18} /></div>
                </div>
              </article>
            ))}
          </div>
          {(errorMessage || successMessage) ? <div className={`mt-5 rounded-[1.35rem] border px-4 py-3 text-sm font-medium ${errorMessage ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"}`}>{errorMessage || successMessage}</div> : null}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(380px,0.88fr)]">
          <div className="space-y-5">
            <section className={`${cardClass} p-5 sm:p-6`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div><p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${uiTheme.textMuted}`}>{tt("directory.eyebrow")}</p><h3 className={`mt-1 text-xl font-black ${uiTheme.textPrimary}`}>{tt("directory.title")}</h3></div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_160px]">
                  <label className="relative block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={tt("directory.searchPlaceholder")} className={`w-full rounded-2xl border py-3 pl-10 pr-4 text-sm ${uiTheme.searchInputMobile}`} /></label>
                  <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className={inputClass}><option value="all">{tt("directory.allRoles")}</option>{ACCOUNT_ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}>{statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {filteredMembers.length === 0 ? <div className={`md:col-span-2 rounded-[1.5rem] border border-dashed px-5 py-10 text-center ${subCardClass}`}><Users size={20} className="mx-auto text-slate-400" /><p className={`mt-4 text-base font-semibold ${uiTheme.textPrimary}`}>{tt("directory.noMembersTitle")}</p><p className={`mt-2 text-sm ${uiTheme.textSecondary}`}>{tt("directory.noMembersHint")}</p></div> : null}
                {filteredMembers.map((member) => {
                  const isSelected = normalizeText(member?.id) === normalizeText(selectedMemberId);
                  const isCurrent = normalizeText(member?.id) === currentUserId;
                  return (
                    <button key={member.id} type="button" onClick={() => setSelectedMemberId(normalizeText(member.id))} className={`w-full rounded-[1.6rem] border p-4 text-left transition ${isSelected ? "border-[#2b59b0]/35 bg-[#2b59b0]/10 shadow-[0_20px_40px_-30px_rgba(43,89,176,0.65)]" : subCardClass}`}>
                      <div className="flex items-start gap-4">
                        <div className="relative"><Avatar src={member.avatar_url} name={member.full_name || member.email} /><span className={`absolute -bottom-1 -right-1 inline-flex h-4 w-4 rounded-full border-2 ${theme === "dark" ? "border-[#0f172a]" : "border-white"} ${member.status === "online" && member.is_active !== false ? "bg-emerald-400" : member.is_active === false ? "bg-amber-400" : "bg-slate-300"}`} /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className={`truncate text-base font-bold ${uiTheme.textPrimary}`}>{member.full_name || member.email || tt("common.unnamedMember")}</p><p className={`truncate text-sm ${uiTheme.textSecondary}`}>{member.email || tt("common.noEmail")}</p></div><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${getRoleMeta(member.role).chip} ${baseChipDark}`}>{getRoleMeta(member.role).label}</span></div>
                          <div className="mt-3 flex flex-wrap gap-2"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${member.is_active === false ? pausedChip : activeChip}`}>{member.is_active === false ? tt("chips.pausedAccess") : tt("chips.activeAccess")}</span>{isCurrent ? <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${theme === "dark" ? "border-[#2b59b0]/40 bg-[#2b59b0]/20 text-[#dbe7ff]" : "border-[#2b59b0]/20 bg-[#2b59b0]/10 text-[#2b59b0]"}`}>{tt("chips.you")}</span> : null}</div>
                          <div className={`mt-4 grid gap-2 text-xs ${uiTheme.textMuted} sm:grid-cols-2`}><p className="truncate"><span className="font-semibold">{tt("memberMeta.department")}:</span> {member.department || "-"}</p><p className="truncate"><span className="font-semibold">{tt("memberMeta.position")}:</span> {member.position || "-"}</p><p className="truncate"><span className="font-semibold">{tt("memberMeta.employee")}:</span> {member.employee_code || "-"}</p><p className="truncate"><span className="font-semibold">{tt("memberMeta.presence")}:</span> {member.status === "online" ? tt("memberMeta.onlineNow") : member.last_seen_at ? formatDateTime(member.last_seen_at) : tt("memberMeta.noActivity")}</p></div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
              <section className={`${cardClass} p-5 sm:p-6`}>
                <div className="flex items-center justify-between gap-3"><div><p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${uiTheme.textMuted}`}>{tt("self.myAccount")}</p><h3 className={`mt-1 text-xl font-black ${uiTheme.textPrimary}`}>{tt("self.updateProfile")}</h3></div><div className="relative"><Avatar src={selfForm.avatar_url} name={selfForm.full_name || selfForm.email} size="h-16 w-16" text="text-lg" />{avatarBusy === "self" ? <span className="absolute inset-0 flex items-center justify-center rounded-[1.35rem] bg-slate-950/55 text-white"><Loader2 size={16} className="animate-spin" /></span> : null}</div></div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => selfAvatarRef.current?.click()} disabled={avatarBusy === "self"} className={ghostButton}><Camera size={15} />{tt("self.changePhoto")}</button>
                  <button type="button" onClick={() => void mutateAvatar({ scope: "self", clear: true })} disabled={!selfForm.avatar_url || avatarBusy === "self"} className={dangerButton}><Trash2 size={15} />{tt("self.removePhoto")}</button>
                  <input ref={selfAvatarRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void mutateAvatar({ scope: "self", file }); }} />
                </div>
                <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={async (event) => {
                  event.preventDefault();
                  if (!sessionUser) return;
                  try {
                    setSavingSelf(true); setErrorMessage(""); setSuccessMessage("");
                    const saved = await updateSelfAccount(sessionUser, currentUser?.role, selfForm);
                    setSelfForm(createProfileForm(saved)); syncCurrentUser(saved); setSuccessMessage("Your account profile has been updated."); await loadData({ silent: true, preferredSelectedId: currentUserId });
                  } catch (error) { console.error("Save self profile error:", error); setErrorMessage(error.message || "Unable to update your account."); } finally { setSavingSelf(false); }
                }}>
                  <Field icon={UserRound} label="Full Name"><input value={selfForm.full_name} onChange={(event) => setSelfForm((prev) => ({ ...prev, full_name: event.target.value }))} className={inputClass} /></Field>
                  <Field icon={Mail} label="Email"><input type="email" value={selfForm.email} onChange={(event) => setSelfForm((prev) => ({ ...prev, email: event.target.value }))} className={inputClass} /></Field>
                  <Field label="First Name EN"><input value={selfForm.first_name_en} onChange={(event) => setSelfForm((prev) => ({ ...prev, first_name_en: event.target.value }))} className={inputClass} /></Field>
                  <Field label="Last Name EN"><input value={selfForm.last_name_en} onChange={(event) => setSelfForm((prev) => ({ ...prev, last_name_en: event.target.value }))} className={inputClass} /></Field>
                  <Field icon={BadgeInfo} label="Employee Code"><input value={selfForm.employee_code} onChange={(event) => setSelfForm((prev) => ({ ...prev, employee_code: event.target.value.toUpperCase() }))} className={inputClass} /></Field>
                  <Field icon={Phone} label="Phone"><input value={selfForm.phone} onChange={(event) => setSelfForm((prev) => ({ ...prev, phone: event.target.value }))} className={inputClass} /></Field>
                  <Field icon={Building2} label="Department"><input value={selfForm.department} onChange={(event) => setSelfForm((prev) => ({ ...prev, department: event.target.value }))} className={inputClass} /></Field>
                  <Field icon={Briefcase} label="Position"><input value={selfForm.position} onChange={(event) => setSelfForm((prev) => ({ ...prev, position: event.target.value }))} className={inputClass} /></Field>
                  <Field icon={MapPin} label="Location"><input value={selfForm.location} onChange={(event) => setSelfForm((prev) => ({ ...prev, location: event.target.value }))} className={inputClass} /></Field>
                  <div className={`md:col-span-2 flex flex-col gap-3 rounded-[1.35rem] border px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${subCardClass}`}><div><p className={`text-sm font-semibold ${uiTheme.textPrimary}`}>{tt("self.currentRole")}: {getRoleMeta(selfForm.role || currentUser?.role).label}</p><p className={`mt-1 text-xs ${uiTheme.textMuted}`}>{tt("self.syncHint")}</p></div><button type="submit" disabled={savingSelf} className={primaryButton}>{savingSelf ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{tt("self.saveProfile")}</button></div>
                </form>
              </section>

              <section className={`${cardClass} p-5 sm:p-6`}>
                <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${uiTheme.textMuted}`}>{tt("self.security")}</p>
                <h3 className={`mt-1 text-xl font-black ${uiTheme.textPrimary}`}>{tt("self.changePassword")}</h3>
                <div className={`mt-4 rounded-[1.35rem] border px-4 py-4 ${subCardClass}`}><p className={`text-sm font-semibold ${uiTheme.textPrimary}`}>{tt("self.sessionPolicy")}</p><p className={`mt-2 text-sm leading-6 ${uiTheme.textSecondary}`}>{tt("password.minimumChars", { count: PASSWORD_MIN_LENGTH })}</p></div>
                <form className="mt-5 grid gap-4" onSubmit={async (event) => {
                  event.preventDefault();
                  try {
                    if (passwordForm.nextPassword.length < PASSWORD_MIN_LENGTH) throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
                    if (passwordForm.nextPassword !== passwordForm.confirmPassword) throw new Error("Password confirmation does not match.");
                    setSavingPassword(true); setErrorMessage(""); setSuccessMessage("");
                    const { error } = await supabase.auth.updateUser({ password: passwordForm.nextPassword }); if (error) throw error;
                    setPasswordForm({ nextPassword: "", confirmPassword: "" }); setSuccessMessage("Your password has been updated.");
                  } catch (error) { console.error("Save password error:", error); setErrorMessage(error.message || "Unable to update your password."); } finally { setSavingPassword(false); }
                }}>
                  <Field icon={ShieldCheck} label={tt("password.newPassword")}><input type="password" value={passwordForm.nextPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, nextPassword: event.target.value }))} className={inputClass} /></Field>
                  <Field icon={ShieldCheck} label={tt("password.confirmPassword")} hint={tt("password.minimumChars", { count: PASSWORD_MIN_LENGTH })}><input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} className={inputClass} /></Field>
                  <button type="submit" disabled={savingPassword} className={primaryButton}>{savingPassword ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}{tt("self.updatePassword")}</button>
                </form>
              </section>
            </div>
          </div>

          <section className={`${cardClass} p-5 sm:p-6 xl:sticky xl:top-5 xl:self-start`}>
            {selectedMember ? (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="relative"><Avatar src={memberForm.avatar_url || selectedMember.avatar_url} name={memberForm.full_name || selectedMember.full_name || selectedMember.email} size="h-20 w-20" text="text-xl" />{avatarBusy === "member" ? <span className="absolute inset-0 flex items-center justify-center rounded-[1.35rem] bg-slate-950/55 text-white"><Loader2 size={18} className="animate-spin" /></span> : null}</div>
                    <div className="min-w-0"><p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${uiTheme.textMuted}`}>{tt("selected.eyebrow")}</p><h3 className={`mt-1 truncate text-2xl font-black ${uiTheme.textPrimary}`}>{selectedMember.full_name || selectedMember.email || tt("common.unnamedMember")}</h3><p className={`mt-2 text-sm ${uiTheme.textSecondary}`}>{selectedMember.email || tt("selected.noEmail")}</p><div className="mt-3 flex flex-wrap gap-2"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${getRoleMeta(selectedMember.role).chip} ${baseChipDark}`}>{getRoleMeta(selectedMember.role).label}</span><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${selectedMember.is_active === false ? pausedChip : activeChip}`}>{selectedMember.is_active === false ? tt("chips.pausedAccess") : tt("chips.activeAccess")}</span>{normalizeText(selectedMember?.id) === currentUserId ? <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${theme === "dark" ? "border-[#2b59b0]/40 bg-[#2b59b0]/20 text-[#dbe7ff]" : "border-[#2b59b0]/20 bg-[#2b59b0]/10 text-[#2b59b0]"}`}>{tt("chips.currentSession")}</span> : null}</div></div>
                  </div>
                  <div className={`rounded-[1.35rem] border px-4 py-3 ${subCardClass}`}><p className={`text-xs font-bold uppercase tracking-[0.18em] ${uiTheme.textMuted}`}>{tt("selected.presence")}</p><p className={`mt-2 text-sm font-semibold ${uiTheme.textPrimary}`}>{selectedMember.status === "online" ? tt("memberMeta.onlineNow") : selectedMember.last_seen_at ? formatDateTime(selectedMember.last_seen_at) : selectedMember.is_active === false ? tt("selected.accessPaused") : tt("selected.noRecentActivity")}</p></div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => memberAvatarRef.current?.click()} disabled={avatarBusy === "member"} className={ghostButton}><Camera size={15} />{tt("selected.changePhoto")}</button>
                  <button type="button" onClick={() => void mutateAvatar({ scope: "member", clear: true })} disabled={!hasSelectedMemberAvatar || avatarBusy === "member"} className={dangerButton}><Trash2 size={15} />{tt("selected.removePhoto")}</button>
                  <button type="button" onClick={async () => { if (!selectedMember.email) return; try { setSendingReset(true); setErrorMessage(""); setSuccessMessage(""); await sendManagedPasswordReset(selectedMember.email); setSuccessMessage(`Password reset instructions were sent to ${selectedMember.email}.`); } catch (error) { console.error("Send reset error:", error); setErrorMessage(error.message || "Unable to send a password reset email."); } finally { setSendingReset(false); } }} disabled={sendingReset || !selectedMember.email} className={actionSecondaryButton}>{sendingReset ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}{tt("selected.sendResetLink")}</button>
                  <button type="button" onClick={() => void confirmMemberAction(selectedMember.is_active === false ? "restore" : "pause")} disabled={isSelectedCurrentUser} className={selectedMember.is_active === false ? primaryButton : dangerButton}><Power size={15} />{selectedMember.is_active === false ? tt("selected.restoreAccess") : tt("selected.pauseAccess")}</button>
                  <input ref={memberAvatarRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void mutateAvatar({ scope: "member", file }); }} />
                </div>
                <div className={`mt-5 rounded-[1.45rem] border p-4 ${subCardClass}`}>
                  <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${uiTheme.textMuted}`}>{tt("password.setPassword")}</p>
                  <h4 className={`mt-1 text-lg font-black ${uiTheme.textPrimary}`}>{tt("password.setNewPasswordTitle")}</h4>
                  <p className={`mt-2 text-sm ${uiTheme.textSecondary}`}>{tt("password.setNewPasswordHint")}</p>
                  {isSelectedCurrentUser ? <div className={`mt-3 rounded-2xl border px-4 py-3 text-xs ${subCardClass}`}>{tt("password.useSecurityPanel")}</div> : null}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field icon={KeyRound} label={tt("password.newPassword")}><input type="password" value={managedPasswordForm.nextPassword} onChange={(event) => setManagedPasswordForm((prev) => ({ ...prev, nextPassword: event.target.value }))} className={inputClass} disabled={isSelectedCurrentUser} /></Field>
                    <Field icon={KeyRound} label={tt("password.confirmPassword")} hint={tt("password.minimumChars", { count: PASSWORD_MIN_LENGTH })}><input type="password" value={managedPasswordForm.confirmPassword} onChange={(event) => setManagedPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} className={inputClass} disabled={isSelectedCurrentUser} /></Field>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <button type="button" onClick={handleSetManagedPassword} disabled={savingManagedPassword || isSelectedCurrentUser} className={primaryButton}>{savingManagedPassword ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}{tt("password.setPasswordNow")}</button>
                  </div>
                </div>
                <form className="mt-6 space-y-5" onSubmit={async (event) => {
                  event.preventDefault();
                  if (!selectedMember?.id) return;
                  try {
                    setSavingMember(true); setErrorMessage(""); setSuccessMessage("");
                    const saved = await updateManagedAccount(selectedMember.id, selectedMember.email, memberForm);
                    if (normalizeText(saved?.id) === currentUserId) { setSelfForm(createProfileForm(saved)); syncCurrentUser(saved); }
                    setMemberForm(createProfileForm(saved)); setSuccessMessage("Member access and profile details have been updated."); await loadData({ silent: true, preferredSelectedId: selectedMember.id });
                  } catch (error) { console.error("Save member error:", error); setErrorMessage(error.message || "Unable to update this member."); } finally { setSavingMember(false); }
                }}>
                  <div className={`rounded-[1.45rem] border p-4 ${subCardClass}`}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field icon={UserRound} label="Full Name"><input value={memberForm.full_name} onChange={(event) => setMemberForm((prev) => ({ ...prev, full_name: event.target.value }))} className={inputClass} /></Field>
                      <Field icon={Mail} label="Email" hint="Auth email changes for other users still require a backend admin endpoint."><input value={selectedMember.email || ""} readOnly className={readOnlyInputClass} /></Field>
                      <Field label="First Name EN"><input value={memberForm.first_name_en} onChange={(event) => setMemberForm((prev) => ({ ...prev, first_name_en: event.target.value }))} className={inputClass} /></Field>
                      <Field label="Last Name EN"><input value={memberForm.last_name_en} onChange={(event) => setMemberForm((prev) => ({ ...prev, last_name_en: event.target.value }))} className={inputClass} /></Field>
                      <Field icon={BadgeInfo} label="Employee Code"><input value={memberForm.employee_code} onChange={(event) => setMemberForm((prev) => ({ ...prev, employee_code: event.target.value.toUpperCase() }))} className={inputClass} /></Field>
                      <Field icon={ShieldCheck} label="Role"><select value={memberForm.role} onChange={(event) => setMemberForm((prev) => ({ ...prev, role: event.target.value }))} className={inputClass}>{ACCOUNT_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
                      <Field icon={Building2} label="Department"><input value={memberForm.department} onChange={(event) => setMemberForm((prev) => ({ ...prev, department: event.target.value }))} className={inputClass} /></Field>
                      <Field icon={Briefcase} label="Position"><input value={memberForm.position} onChange={(event) => setMemberForm((prev) => ({ ...prev, position: event.target.value }))} className={inputClass} /></Field>
                      <Field icon={Phone} label="Phone"><input value={memberForm.phone} onChange={(event) => setMemberForm((prev) => ({ ...prev, phone: event.target.value }))} className={inputClass} /></Field>
                      <Field icon={MapPin} label="Location"><input value={memberForm.location} onChange={(event) => setMemberForm((prev) => ({ ...prev, location: event.target.value }))} className={inputClass} /></Field>
                    </div>
                  </div>
                  <div className={`rounded-[1.45rem] border p-4 ${subCardClass}`}><div className="flex items-start gap-3"><div className="rounded-2xl bg-[#2b59b0]/10 p-3 text-[#2b59b0]"><Clock3 size={18} /></div><div className="min-w-0"><p className={`text-sm font-semibold ${uiTheme.textPrimary}`}>Record details</p><div className={`mt-3 grid gap-2 text-sm ${uiTheme.textSecondary} sm:grid-cols-2`}><p className="truncate">Created: {formatDateTime(selectedMember.created_at)}</p><p className="truncate">Last seen: {selectedMember.last_seen_at ? formatDateTime(selectedMember.last_seen_at) : "-"}</p><p className="truncate">User ID: {selectedMember.id || "-"}</p><p className="truncate">Access state: {selectedMember.is_active === false ? "Paused" : "Active"}</p></div></div></div></div>
                  <button type="submit" disabled={savingMember} className={primaryButton}>{savingMember ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Save member changes</button>
                  {canHardDelete && normalizeText(selectedMember?.id) !== currentUserId ? <button type="button" onClick={() => void confirmMemberAction("delete")} className={dangerButton}><Trash2 size={15} />Delete profile record</button> : <div className={`rounded-[1.3rem] border px-4 py-3 text-xs ${subCardClass}`}><div className="flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5 text-amber-500" /><p className={uiTheme.textMuted}>Hard profile deletion is restricted to admin accounts. IT Support can still edit, reset, and pause access.</p></div></div>}
                </form>
              </>
            ) : <div className={`rounded-[1.6rem] border border-dashed px-6 py-14 text-center ${subCardClass}`}><Users size={24} className="mx-auto text-slate-400" /><p className={`mt-4 text-lg font-semibold ${uiTheme.textPrimary}`}>Select a member from the directory</p><p className={`mt-2 text-sm ${uiTheme.textSecondary}`}>The right panel will show profile, access, avatar, and password recovery actions.</p></div>}
          </section>
        </div>
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-3" onClick={() => { if (!creatingMember) resetCreate(); }}>
          <div className={`${cardClass} w-full max-w-4xl overflow-hidden`} onClick={(event) => event.stopPropagation()}>
            <div className={`border-b px-5 py-4 sm:px-6 ${dividerClass}`}><div className="flex items-start justify-between gap-3"><div><p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${uiTheme.textMuted}`}>{tt("create.eyebrow")}</p><h3 className={`mt-1 text-2xl font-black ${uiTheme.textPrimary}`}>{tt("create.title")}</h3></div><button type="button" onClick={() => resetCreate()} disabled={creatingMember} className={ghostButton}><XCircle size={16} />{tt("create.close")}</button></div></div>
            <form className="max-h-[80vh] overflow-y-auto p-5 sm:p-6" onSubmit={async (event) => {
              event.preventDefault();
              try {
                if (!normalizeText(createForm.email)) throw new Error("Email is required.");
                if (!normalizeText(createForm.employee_code)) throw new Error("Employee code is required.");
                if (createForm.nextPassword.length < PASSWORD_MIN_LENGTH) throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
                if (createForm.nextPassword !== createForm.confirmPassword) throw new Error("Password confirmation does not match.");
                setCreatingMember(true); setErrorMessage(""); setSuccessMessage("");
                const { user, profile } = await createManagedAccount(createForm, createForm.nextPassword);
                if (createAvatarFile) {
                  const avatarUrl = await uploadManagedAccountAvatar(user.id, createAvatarFile);
                  await updateManagedAccount(user.id, profile.email, { ...profile, avatar_url: avatarUrl });
                }
                resetCreate(); setSuccessMessage("New member account created."); await loadData({ silent: true, preferredSelectedId: user.id });
              } catch (error) { console.error("Create member error:", error); setErrorMessage(error.message || "Unable to create the new member account."); } finally { setCreatingMember(false); }
            }}>
              <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className={`rounded-[1.5rem] border p-5 ${subCardClass}`}><div className="flex items-center justify-between gap-3"><div><p className={`text-sm font-semibold ${uiTheme.textPrimary}`}>{tt("create.profileImage")}</p><p className={`mt-1 text-xs ${uiTheme.textMuted}`}>{tt("create.imageHint")}</p></div><div className="rounded-2xl bg-[#2b59b0]/10 p-3 text-[#2b59b0]"><Camera size={18} /></div></div><div className="mt-5 flex justify-center"><Avatar src={createAvatarPreview} name={createForm.full_name || createForm.email || tt("create.newMember")} size="h-32 w-32" text="text-3xl" /></div><div className="mt-5 grid gap-3"><button type="button" onClick={() => createAvatarRef.current?.click()} className={ghostButton}><Plus size={15} />{tt("create.chooseImage")}</button><button type="button" onClick={() => { if (createAvatarPreview) URL.revokeObjectURL(createAvatarPreview); setCreateAvatarFile(null); setCreateAvatarPreview(""); }} disabled={!createAvatarPreview} className={dangerButton}><Trash2 size={15} />{tt("create.removeImage")}</button><input ref={createAvatarRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; if (!String(file.type || "").startsWith("image/")) { setErrorMessage("Profile image must be an image file."); return; } if (file.size > PROFILE_AVATAR_MAX_SIZE_BYTES) { setErrorMessage("Profile image must be 3 MB or smaller."); return; } if (createAvatarPreview) URL.revokeObjectURL(createAvatarPreview); setCreateAvatarFile(file); setCreateAvatarPreview(URL.createObjectURL(file)); setErrorMessage(""); }} /></div></div>
                <div className="space-y-5">
                  <div className={`rounded-[1.5rem] border p-5 ${subCardClass}`}><p className={`text-sm font-semibold ${uiTheme.textPrimary}`}>{tt("create.identityAccess")}</p><div className="mt-4 grid gap-4 md:grid-cols-2"><Field icon={UserRound} label={tt("create.fullName")}><input value={createForm.full_name} onChange={(event) => setCreateForm((prev) => ({ ...prev, full_name: event.target.value }))} className={inputClass} required /></Field><Field icon={Mail} label={tt("create.email")}><input type="email" value={createForm.email} onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value.toLowerCase() }))} className={inputClass} required /></Field><Field icon={BadgeInfo} label={tt("create.employeeCode")}><input value={createForm.employee_code} onChange={(event) => setCreateForm((prev) => ({ ...prev, employee_code: event.target.value.toUpperCase() }))} className={inputClass} required /></Field><Field icon={ShieldCheck} label={tt("create.role")}><select value={createForm.role} onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value }))} className={inputClass}>{ACCOUNT_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field icon={KeyRound} label={tt("create.temporaryPassword")}><input type="password" value={createForm.nextPassword} onChange={(event) => setCreateForm((prev) => ({ ...prev, nextPassword: event.target.value }))} className={inputClass} required /></Field><Field icon={KeyRound} label={tt("create.confirmPassword")} hint={tt("password.minimumChars", { count: PASSWORD_MIN_LENGTH })}><input type="password" value={createForm.confirmPassword} onChange={(event) => setCreateForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} className={inputClass} required /></Field></div></div>
                  <div className={`rounded-[1.5rem] border p-5 ${subCardClass}`}><p className={`text-sm font-semibold ${uiTheme.textPrimary}`}>{tt("create.workProfile")}</p><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label={tt("create.firstNameEn")}><input value={createForm.first_name_en} onChange={(event) => setCreateForm((prev) => ({ ...prev, first_name_en: event.target.value }))} className={inputClass} /></Field><Field label={tt("create.lastNameEn")}><input value={createForm.last_name_en} onChange={(event) => setCreateForm((prev) => ({ ...prev, last_name_en: event.target.value }))} className={inputClass} /></Field><Field icon={Building2} label={tt("create.department")}><input value={createForm.department} onChange={(event) => setCreateForm((prev) => ({ ...prev, department: event.target.value }))} className={inputClass} /></Field><Field icon={Briefcase} label={tt("create.position")}><input value={createForm.position} onChange={(event) => setCreateForm((prev) => ({ ...prev, position: event.target.value }))} className={inputClass} /></Field><Field icon={Phone} label={tt("create.phone")}><input value={createForm.phone} onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))} className={inputClass} /></Field><Field icon={MapPin} label={tt("create.location")}><input value={createForm.location} onChange={(event) => setCreateForm((prev) => ({ ...prev, location: event.target.value }))} className={inputClass} /></Field></div></div>
                </div>
              </div>
              <div className={`mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between ${dividerClass}`}><p className={`text-sm ${uiTheme.textSecondary}`}>{tt("create.footerHint")}</p><button type="submit" disabled={creatingMember} className={primaryButton}>{creatingMember ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}{tt("create.submit")}</button></div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
