import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeInfo,
  Briefcase,
  Building2,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "it_support", label: "IT Support" },
  { value: "it_manager", label: "IT Manager" },
  { value: "executive", label: "Executive" },
  { value: "auditor", label: "Auditor" },
  { value: "admin", label: "Admin" },
];

const PASSWORD_MIN_LENGTH = 8;

function normalizeText(value) {
  return String(value || "").trim();
}

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

function createProfileForm(profile = {}) {
  const source = profile && typeof profile === "object" ? profile : {};
  return {
    full_name: source.full_name || source.name || "",
    first_name_en: source.first_name_en || "",
    last_name_en: source.last_name_en || "",
    email: source.email || "",
    employee_code: source.employee_code || source.employeeId || "",
    phone: source.phone || "",
    location: source.location || "",
    department: source.department || "",
    position: source.position || "",
    avatar_url: source.avatar_url || source.avatar || "",
    role: source.role || "user",
  };
}

function Field({ icon: Icon, label, hint = "", children }) {
  return (
    <label className="block">
      <span className="mb-1.5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {Icon ? <Icon size={13} /> : null}
        {label}
      </span>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </label>
  );
}

export default function SettingsPage({ theme, uiTheme, currentUser, onCurrentUserUpdate }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSelf, setSavingSelf] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selfForm, setSelfForm] = useState(createProfileForm(currentUser));
  const [memberForm, setMemberForm] = useState(createProfileForm());
  const [passwordForm, setPasswordForm] = useState({ nextPassword: "", confirmPassword: "" });

  const inputClass =
    theme === "dark"
      ? "w-full rounded-xl border border-slate-600 bg-[#162136] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-[#2b59b0]"
      : "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#2b59b0]";
  const readOnlyInputClass =
    theme === "dark"
      ? `${inputClass} cursor-not-allowed bg-slate-800/80 text-slate-400`
      : `${inputClass} cursor-not-allowed bg-slate-100 text-slate-500`;
  const softCardClass =
    theme === "dark"
      ? "rounded-2xl border border-slate-700 bg-[#0f172a]"
      : "rounded-2xl border border-slate-200 bg-white";

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
    });
  };

  const loadSettingsData = async ({ silent = false } = {}) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      setErrorMessage("");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;

      const rows = Array.isArray(data) ? [...data] : [];
      const fallbackOwnProfile = {
        id: session.user.id,
        email: session.user.email || currentUser?.email || "",
        full_name: session.user.user_metadata?.full_name || currentUser?.name || session.user.email || "",
        first_name_en: session.user.user_metadata?.first_name_en || "",
        last_name_en: session.user.user_metadata?.last_name_en || "",
        employee_code: session.user.user_metadata?.employee_code || session.user.user_metadata?.employee_id || currentUser?.employeeId || "",
        phone: session.user.user_metadata?.phone || currentUser?.phone || "",
        location: session.user.user_metadata?.location || session.user.user_metadata?.work_location || currentUser?.location || "",
        department: session.user.user_metadata?.department || currentUser?.department || "",
        position: session.user.user_metadata?.position || currentUser?.position || "",
        avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || currentUser?.avatar || "",
        role: currentUser?.role || session.user.user_metadata?.role || "it_support",
        created_at: session.user.created_at,
      };

      const ownIndex = rows.findIndex((item) => String(item?.id || "") === String(session.user.id));
      const ownProfile = ownIndex >= 0 ? rows[ownIndex] : fallbackOwnProfile;
      if (ownIndex < 0) rows.unshift(fallbackOwnProfile);

      setCurrentUserId(String(session.user.id));
      setMembers(rows);
      setSelfForm(createProfileForm(ownProfile));
      setSelectedMemberId((previous) => (
        previous && rows.some((item) => String(item?.id || "") === previous)
          ? previous
          : String(ownProfile?.id || rows[0]?.id || "")
      ));
      syncCurrentUser(ownProfile);
    } catch (error) {
      console.error("Load settings page error:", error);
      setErrorMessage(error.message || "Unable to load account settings.");
      setMembers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadSettingsData();
  }, []);

  const filteredMembers = useMemo(() => {
    const keyword = normalizeText(searchQuery).toLowerCase();
    return members.filter((member) => {
      if (!keyword) return true;
      const source = [member.full_name, member.email, member.employee_code, member.department, member.position, member.role]
        .map((value) => normalizeText(value).toLowerCase())
        .join(" ");
      return source.includes(keyword);
    });
  }, [members, searchQuery]);

  const selectedMember = useMemo(
    () => members.find((member) => String(member?.id || "") === String(selectedMemberId || "")) || null,
    [members, selectedMemberId],
  );

  useEffect(() => {
    setMemberForm(createProfileForm(selectedMember));
  }, [selectedMember]);

  const memberSummary = useMemo(() => ({
    total: members.length,
    admins: members.filter((item) => normalizeText(item?.role).toLowerCase() === "admin").length,
    itTeam: members.filter((item) => ["it_support", "it_manager", "admin"].includes(normalizeText(item?.role).toLowerCase())).length,
    users: members.filter((item) => normalizeText(item?.role).toLowerCase() === "user").length,
  }), [members]);

  const handleSaveSelf = async (event) => {
    event.preventDefault();
    try {
      setSavingSelf(true);
      setErrorMessage("");
      setSuccessMessage("");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");
      const profilePayload = {
        id: session.user.id,
        email: normalizeText(selfForm.email).toLowerCase() || session.user.email || "",
        full_name: normalizeText(selfForm.full_name),
        first_name_en: normalizeText(selfForm.first_name_en),
        last_name_en: normalizeText(selfForm.last_name_en),
        employee_code: normalizeText(selfForm.employee_code).toUpperCase(),
        phone: normalizeText(selfForm.phone),
        location: normalizeText(selfForm.location),
        department: normalizeText(selfForm.department),
        position: normalizeText(selfForm.position),
        avatar_url: normalizeText(selfForm.avatar_url),
        role: currentUser?.role || selfForm.role || "it_support",
      };
      const nextMetadata = { ...profilePayload };
      delete nextMetadata.id;
      delete nextMetadata.email;
      const currentEmail = normalizeText(session.user.email).toLowerCase();
      const authPayload = profilePayload.email && profilePayload.email !== currentEmail ? { email: profilePayload.email, data: nextMetadata } : { data: nextMetadata };
      const { error: authError } = await supabase.auth.updateUser(authPayload);
      if (authError) throw authError;
      const { error: profileError } = await supabase.from("profiles").upsert(profilePayload);
      if (profileError) throw profileError;
      syncCurrentUser(profilePayload);
      setSuccessMessage("Account profile updated.");
      await loadSettingsData({ silent: true });
    } catch (error) {
      console.error("Save self profile error:", error);
      setErrorMessage(error.message || "Unable to update your account.");
    } finally {
      setSavingSelf(false);
    }
  };

  const handleSavePassword = async (event) => {
    event.preventDefault();
    try {
      if (passwordForm.nextPassword.length < PASSWORD_MIN_LENGTH) {
        throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      }
      if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
        throw new Error("Password confirmation does not match.");
      }
      setSavingPassword(true);
      setErrorMessage("");
      setSuccessMessage("");
      const { error } = await supabase.auth.updateUser({ password: passwordForm.nextPassword });
      if (error) throw error;
      setPasswordForm({ nextPassword: "", confirmPassword: "" });
      setSuccessMessage("Password changed successfully.");
    } catch (error) {
      console.error("Save password error:", error);
      setErrorMessage(error.message || "Unable to change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveMember = async (event) => {
    event.preventDefault();
    if (!selectedMember?.id) return;
    try {
      setSavingMember(true);
      setErrorMessage("");
      setSuccessMessage("");
      const payload = {
        id: selectedMember.id,
        email: normalizeText(selectedMember.email),
        full_name: normalizeText(memberForm.full_name),
        first_name_en: normalizeText(memberForm.first_name_en),
        last_name_en: normalizeText(memberForm.last_name_en),
        employee_code: normalizeText(memberForm.employee_code).toUpperCase(),
        phone: normalizeText(memberForm.phone),
        location: normalizeText(memberForm.location),
        department: normalizeText(memberForm.department),
        position: normalizeText(memberForm.position),
        avatar_url: normalizeText(memberForm.avatar_url),
        role: normalizeText(memberForm.role).toLowerCase() || "user",
      };
      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;
      if (String(payload.id) === currentUserId) {
        setSelfForm(createProfileForm(payload));
        syncCurrentUser(payload);
      }
      setSuccessMessage("Member profile updated.");
      await loadSettingsData({ silent: true });
    } catch (error) {
      console.error("Save member error:", error);
      setErrorMessage(error.message || "Unable to update this member.");
    } finally {
      setSavingMember(false);
    }
  };

  if (loading) {
    return (
      <section className={`rounded-2xl border p-10 text-center ${uiTheme.surfaceCard}`}>
        <Loader2 size={20} className="mx-auto animate-spin text-[#2b59b0]" />
        <p className={`mt-3 text-sm ${uiTheme.textSecondary}`}>Loading account center...</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className={`rounded-2xl border p-5 ${uiTheme.surfaceCard}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${uiTheme.textMuted}`}>Account Center</p>
            <h2 className={`mt-1 text-2xl font-black ${uiTheme.textPrimary}`}>Manage your profile and every member account</h2>
            <p className={`mt-2 max-w-3xl text-sm ${uiTheme.textSecondary}`}>This page combines self-service account updates, password change, full member directory, and profile or role management for other accounts.</p>
          </div>
          <button type="button" onClick={() => void loadSettingsData({ silent: true })} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${uiTheme.statusButton}`}>
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className={softCardClass}><div className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Members</p><p className="mt-2 text-3xl font-black text-[#2b59b0]">{memberSummary.total}</p></div></article>
          <article className={softCardClass}><div className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Admins</p><p className="mt-2 text-3xl font-black text-rose-500">{memberSummary.admins}</p></div></article>
          <article className={softCardClass}><div className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">IT Team</p><p className="mt-2 text-3xl font-black text-amber-500">{memberSummary.itTeam}</p></div></article>
          <article className={softCardClass}><div className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">End Users</p><p className="mt-2 text-3xl font-black text-emerald-500">{memberSummary.users}</p></div></article>
        </div>

        {(errorMessage || successMessage) ? (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${errorMessage ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {errorMessage || successMessage}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <section className={`rounded-2xl border p-5 ${uiTheme.surfaceCard}`}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#2b59b0]/10 p-3 text-[#2b59b0]"><UserRound size={20} /></div>
              <div><h3 className={`text-lg font-semibold ${uiTheme.textPrimary}`}>My Account</h3><p className={`text-sm ${uiTheme.textSecondary}`}>Update profile name, employee info, contact, and work context.</p></div>
            </div>
            <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSaveSelf}>
              <Field icon={UserRound} label="Full Name"><input value={selfForm.full_name} onChange={(event) => setSelfForm((prev) => ({ ...prev, full_name: event.target.value }))} className={inputClass} /></Field>
              <Field icon={Mail} label="Email"><input type="email" value={selfForm.email} onChange={(event) => setSelfForm((prev) => ({ ...prev, email: event.target.value }))} className={inputClass} /></Field>
              <Field label="First Name EN"><input value={selfForm.first_name_en} onChange={(event) => setSelfForm((prev) => ({ ...prev, first_name_en: event.target.value }))} className={inputClass} /></Field>
              <Field label="Last Name EN"><input value={selfForm.last_name_en} onChange={(event) => setSelfForm((prev) => ({ ...prev, last_name_en: event.target.value }))} className={inputClass} /></Field>
              <Field icon={BadgeInfo} label="Employee Code"><input value={selfForm.employee_code} onChange={(event) => setSelfForm((prev) => ({ ...prev, employee_code: event.target.value.toUpperCase() }))} className={inputClass} /></Field>
              <Field icon={Phone} label="Phone"><input value={selfForm.phone} onChange={(event) => setSelfForm((prev) => ({ ...prev, phone: event.target.value }))} className={inputClass} /></Field>
              <Field icon={Building2} label="Department"><input value={selfForm.department} onChange={(event) => setSelfForm((prev) => ({ ...prev, department: event.target.value }))} className={inputClass} /></Field>
              <Field icon={Briefcase} label="Position"><input value={selfForm.position} onChange={(event) => setSelfForm((prev) => ({ ...prev, position: event.target.value }))} className={inputClass} /></Field>
              <Field icon={MapPin} label="Work Location"><input value={selfForm.location} onChange={(event) => setSelfForm((prev) => ({ ...prev, location: event.target.value }))} className={inputClass} /></Field>
              <Field label="Avatar URL" hint="Optional public image URL for profile preview"><input value={selfForm.avatar_url} onChange={(event) => setSelfForm((prev) => ({ ...prev, avatar_url: event.target.value }))} className={inputClass} /></Field>
              <div className="md:col-span-2 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                <div><p className={`text-sm font-semibold ${uiTheme.textPrimary}`}>Current access role: {selfForm.role || currentUser?.role || "-"}</p><p className={`text-xs ${uiTheme.textMuted}`}>Profile edits are saved to both your profile record and auth metadata.</p></div>
                <button type="submit" disabled={savingSelf} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2b59b0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244a95] disabled:opacity-60">{savingSelf ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Save profile</button>
              </div>
            </form>
          </section>

          <section className={`rounded-2xl border p-5 ${uiTheme.surfaceCard}`}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-500"><KeyRound size={20} /></div>
              <div><h3 className={`text-lg font-semibold ${uiTheme.textPrimary}`}>Password</h3><p className={`text-sm ${uiTheme.textSecondary}`}>Change your own password directly from the admin dashboard.</p></div>
            </div>
            <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSavePassword}>
              <Field icon={ShieldCheck} label="New Password"><input type="password" value={passwordForm.nextPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, nextPassword: event.target.value }))} className={inputClass} /></Field>
              <Field icon={ShieldCheck} label="Confirm Password" hint={`Minimum ${PASSWORD_MIN_LENGTH} characters`}><input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} className={inputClass} /></Field>
              <div className="md:col-span-2 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                <p className={`text-xs ${uiTheme.textMuted}`}>Other users still need a reset flow or backend admin action for credential changes.</p>
                <button type="submit" disabled={savingPassword} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">{savingPassword ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}Update password</button>
              </div>
            </form>
          </section>
        </div>

        <div className="space-y-4">
          <section className={`rounded-2xl border p-5 ${uiTheme.surfaceCard}`}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-500"><Users size={20} /></div>
              <div><h3 className={`text-lg font-semibold ${uiTheme.textPrimary}`}>Member Directory</h3><p className={`text-sm ${uiTheme.textSecondary}`}>Search every registered account and open a profile editor from this list.</p></div>
            </div>
            <div className="mt-4 relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by name, email, department, role..." className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm ${uiTheme.searchInputMobile}`} />
            </div>
            <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {filteredMembers.length === 0 ? (
                <div className={`rounded-xl border border-dashed px-4 py-8 text-center ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-sm font-medium ${uiTheme.textSecondary}`}>No members found.</p>
                </div>
              ) : null}
              {filteredMembers.map((member) => {
                const isActive = String(member?.id || "") === String(selectedMemberId || "");
                const isCurrent = String(member?.id || "") === currentUserId;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedMemberId(String(member.id))}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      isActive
                        ? "border-[#2b59b0]/40 bg-[#2b59b0]/10"
                        : theme === "dark"
                          ? "border-slate-700 bg-[#0f172a] hover:border-slate-600"
                          : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold ${uiTheme.textPrimary}`}>{member.full_name || member.email || "Unnamed member"}</p>
                        <p className={`truncate text-xs ${uiTheme.textSecondary}`}>{member.email || "-"}</p>
                        <p className={`mt-1 truncate text-xs ${uiTheme.textMuted}`}>{(member.department || "-")} - {(member.position || member.role || "-")}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-600 dark:bg-[#162136] dark:text-slate-200">{member.role || "user"}</span>
                        {isCurrent ? <p className="mt-1 text-[11px] font-semibold text-[#2b59b0]">You</p> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={`rounded-2xl border p-5 ${uiTheme.surfaceCard}`}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-500"><BadgeInfo size={20} /></div>
              <div><h3 className={`text-lg font-semibold ${uiTheme.textPrimary}`}>Selected Member</h3><p className={`text-sm ${uiTheme.textSecondary}`}>Edit account profile data and application role from one place.</p></div>
            </div>
            {selectedMember ? (
              <form className="mt-5 grid gap-4" onSubmit={handleSaveMember}>
                <Field icon={UserRound} label="Full Name"><input value={memberForm.full_name} onChange={(event) => setMemberForm((prev) => ({ ...prev, full_name: event.target.value }))} className={inputClass} /></Field>
                <Field icon={Mail} label="Email" hint="Displayed from profile record. Auth email updates for other users require backend admin flow."><input value={selectedMember.email || ""} readOnly className={readOnlyInputClass} /></Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="First Name EN"><input value={memberForm.first_name_en} onChange={(event) => setMemberForm((prev) => ({ ...prev, first_name_en: event.target.value }))} className={inputClass} /></Field>
                  <Field label="Last Name EN"><input value={memberForm.last_name_en} onChange={(event) => setMemberForm((prev) => ({ ...prev, last_name_en: event.target.value }))} className={inputClass} /></Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field icon={BadgeInfo} label="Employee Code"><input value={memberForm.employee_code} onChange={(event) => setMemberForm((prev) => ({ ...prev, employee_code: event.target.value.toUpperCase() }))} className={inputClass} /></Field>
                  <Field icon={ShieldCheck} label="Role"><select value={memberForm.role} onChange={(event) => setMemberForm((prev) => ({ ...prev, role: event.target.value }))} className={inputClass}>{ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field icon={Building2} label="Department"><input value={memberForm.department} onChange={(event) => setMemberForm((prev) => ({ ...prev, department: event.target.value }))} className={inputClass} /></Field>
                  <Field icon={Briefcase} label="Position"><input value={memberForm.position} onChange={(event) => setMemberForm((prev) => ({ ...prev, position: event.target.value }))} className={inputClass} /></Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field icon={Phone} label="Phone"><input value={memberForm.phone} onChange={(event) => setMemberForm((prev) => ({ ...prev, phone: event.target.value }))} className={inputClass} /></Field>
                  <Field icon={MapPin} label="Location"><input value={memberForm.location} onChange={(event) => setMemberForm((prev) => ({ ...prev, location: event.target.value }))} className={inputClass} /></Field>
                </div>
                <Field label="Avatar URL"><input value={memberForm.avatar_url} onChange={(event) => setMemberForm((prev) => ({ ...prev, avatar_url: event.target.value }))} className={inputClass} /></Field>
                <div className={`rounded-xl border px-4 py-3 text-xs ${theme === "dark" ? "border-slate-700 bg-[#0f172a] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                  <p className="font-semibold">Member record</p>
                  <p className="mt-1">Created: {formatDateTime(selectedMember.created_at)}</p>
                  <p className="mt-1">User ID: {selectedMember.id || "-"}</p>
                  <p className="mt-2">This editor updates the application profile and role. Password reset and auth email control for other users still require the normal reset flow or a backend admin endpoint.</p>
                </div>
                <button type="submit" disabled={savingMember} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2b59b0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244a95] disabled:opacity-60">{savingMember ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Save member changes</button>
              </form>
            ) : (
              <div className={`mt-5 rounded-xl border border-dashed p-8 text-center ${theme === "dark" ? "border-slate-700 bg-[#0f172a]" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-sm font-medium ${uiTheme.textSecondary}`}>Choose a member from the directory to start editing.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
