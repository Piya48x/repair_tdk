import imageCompression from "browser-image-compression";
import { createClient } from "@supabase/supabase-js";
import { getPasswordResetRedirectUrl } from "../../../lib/authHelpers";
import { supabase } from "../../../lib/supabaseClient";

export const ACCOUNT_ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "it_support", label: "IT Support" },
  { value: "it_manager", label: "IT Manager" },
  { value: "executive", label: "Executive" },
  { value: "auditor", label: "Auditor" },
  { value: "admin", label: "Admin" },
];

export const PROFILE_AVATAR_BUCKET = "profile-avatars";
export const PROFILE_AVATAR_MAX_SIZE_BYTES = 3 * 1024 * 1024;
export const PASSWORD_MIN_LENGTH = 8;
const LEGACY_PROFILE_AVATAR_COLUMN = "id_card_url";
const ACCOUNT_ROLE_VALUES = new Set(ACCOUNT_ROLE_OPTIONS.map((option) => option.value));
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const EMPLOYEE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9._/-]{1,31}$/;
const ENGLISH_NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;
const PHONE_PATTERN = /^\+?[0-9()\-\s]{8,24}$/;

const MANAGEMENT_ROLES = new Set(["it_support", "admin"]);
const IMAGE_MIME_PREFIX = "image/";
const TEMP_CLIENT_OPTIONS = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
const AVATAR_COMPRESSION_OPTIONS = {
  maxSizeMB: 1.2,
  maxWidthOrHeight: 1280,
  useWebWorker: true,
};
const INLINE_AVATAR_MAX_METADATA_LENGTH = 1800;

export function normalizeText(value) {
  return String(value || "").trim();
}

export function normalizeRole(role) {
  return normalizeText(role).toLowerCase();
}

export function isManagementRole(role) {
  return MANAGEMENT_ROLES.has(normalizeRole(role));
}

export function createProfileForm(profile = {}) {
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
    avatar_url: source.avatar_url || source.id_card_url || source.avatar || "",
    role: normalizeRole(source.role) || "user",
    is_active: source.is_active !== false,
  };
}

export function validateAccountProfile(
  profile,
  {
    requireWorkProfile = true,
    password = "",
    confirmPassword = "",
    requirePassword = false,
  } = {},
) {
  const form = createProfileForm(profile);
  const errors = {};
  const fullName = normalizeText(form.full_name);
  const email = normalizeText(form.email).toLowerCase();
  const employeeCode = normalizeText(form.employee_code).toUpperCase();
  const role = normalizeRole(form.role);
  const phone = normalizeText(form.phone);
  const phoneDigitCount = phone.replace(/\D/g, "").length;
  const nextPassword = String(password || "");
  const passwordConfirmation = String(confirmPassword || "");

  if (!fullName) errors.full_name = "required";
  else if (fullName.length < 2) errors.full_name = "fullNameTooShort";

  if (!email) errors.email = "required";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "invalidEmail";

  if (!employeeCode) errors.employee_code = "required";
  else if (!EMPLOYEE_CODE_PATTERN.test(employeeCode)) errors.employee_code = "invalidEmployeeCode";

  if (!role || !ACCOUNT_ROLE_VALUES.has(role)) errors.role = "invalidRole";

  if (requireWorkProfile) {
    if (!normalizeText(form.department)) errors.department = "required";
    if (!normalizeText(form.position)) errors.position = "required";
    if (!normalizeText(form.location)) errors.location = "required";
  }

  if (normalizeText(form.first_name_en) && !ENGLISH_NAME_PATTERN.test(normalizeText(form.first_name_en))) {
    errors.first_name_en = "invalidEnglishName";
  }
  if (normalizeText(form.last_name_en) && !ENGLISH_NAME_PATTERN.test(normalizeText(form.last_name_en))) {
    errors.last_name_en = "invalidEnglishName";
  }
  if (phone && (!PHONE_PATTERN.test(phone) || phoneDigitCount < 8 || phoneDigitCount > 15)) {
    errors.phone = "invalidPhone";
  }

  if (requirePassword || nextPassword || passwordConfirmation) {
    if (!nextPassword) errors.nextPassword = "required";
    else if (nextPassword.length < PASSWORD_MIN_LENGTH) errors.nextPassword = "passwordTooShort";

    if (!passwordConfirmation) errors.confirmPassword = "required";
    else if (nextPassword !== passwordConfirmation) errors.confirmPassword = "passwordMismatch";
  }

  return errors;
}

const VALIDATION_FALLBACK_MESSAGES = {
  full_name: "Full name is required.",
  email: "Enter a valid email address.",
  employee_code: "Enter a valid employee code.",
  role: "Select a valid account role.",
  department: "Department is required.",
  position: "Position is required.",
  location: "Work location is required.",
  first_name_en: "English first name contains unsupported characters.",
  last_name_en: "English last name contains unsupported characters.",
  phone: "Enter a valid phone number.",
  nextPassword: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  confirmPassword: "Password confirmation does not match.",
};

function createAccountServiceError(code, message, validationErrors = {}) {
  const error = new Error(message);
  error.code = code;
  error.validationErrors = validationErrors;
  return error;
}

function assertValidAccountProfile(profile, options) {
  const validationErrors = validateAccountProfile(profile, options);
  const firstField = Object.keys(validationErrors)[0];
  if (!firstField) return;
  throw createAccountServiceError(
    "ACCOUNT_VALIDATION_FAILED",
    VALIDATION_FALLBACK_MESSAGES[firstField] || "Please check the highlighted account fields.",
    validationErrors,
  );
}

function createDuplicateAccountError({ email = false, employeeCode = false } = {}) {
  const validationErrors = {};
  if (email) validationErrors.email = "duplicateEmail";
  if (employeeCode) validationErrors.employee_code = "duplicateEmployeeCode";
  const message = email && employeeCode
    ? "This email and employee code are already linked to another account."
    : email
      ? "This email is already linked to another account."
      : "This employee code is already linked to another account.";
  return createAccountServiceError("ACCOUNT_DUPLICATE", message, validationErrors);
}

function mapAccountMutationError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  const duplicate = code === "23505" || message.includes("duplicate") || message.includes("already registered") || message.includes("already been registered") || message.includes("user already exists");
  if (!duplicate) return error;

  const employeeCode = message.includes("employee_code") || message.includes("employee code");
  const email = message.includes("email") || !employeeCode;
  return createDuplicateAccountError({ email, employeeCode });
}

function isMissingDuplicateCheckRpc(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return ["42883", "PGRST202"].includes(code) || message.includes("check_managed_account_duplicates");
}

export async function checkManagedAccountDuplicates({
  email,
  employeeCode,
  excludeUserId = "",
} = {}) {
  const normalizedEmail = normalizeText(email).toLowerCase();
  const normalizedEmployeeCode = normalizeText(employeeCode).toUpperCase();
  const excludedId = normalizeText(excludeUserId);

  const { data: duplicateData, error: duplicateError } = await supabase.rpc(
    "check_managed_account_duplicates",
    {
      _email: normalizedEmail,
      _employee_code: normalizedEmployeeCode,
      _exclude_user_id: excludedId || null,
    },
  );

  if (!duplicateError) {
    return {
      email: Boolean(duplicateData?.email_exists),
      employeeCode: Boolean(duplicateData?.employee_code_exists),
    };
  }
  if (!isMissingDuplicateCheckRpc(duplicateError)) throw duplicateError;

  let emailQuery = supabase.from("profiles").select("id").ilike("email", normalizedEmail).limit(1);
  let employeeQuery = supabase.from("profiles").select("id").ilike("employee_code", normalizedEmployeeCode).limit(1);
  if (excludedId) {
    emailQuery = emailQuery.neq("id", excludedId);
    employeeQuery = employeeQuery.neq("id", excludedId);
  }

  const [emailResult, employeeResult] = await Promise.all([emailQuery.maybeSingle(), employeeQuery.maybeSingle()]);
  if (emailResult.error) throw emailResult.error;
  if (employeeResult.error) throw employeeResult.error;
  return { email: Boolean(emailResult.data), employeeCode: Boolean(employeeResult.data) };
}

async function assertAccountIdentityAvailable(profile, excludeUserId = "") {
  const duplicates = await checkManagedAccountDuplicates({
    email: profile?.email,
    employeeCode: profile?.employee_code,
    excludeUserId,
  });
  if (duplicates.email || duplicates.employeeCode) throw createDuplicateAccountError(duplicates);
}

function sanitizeFileName(fileName) {
  const normalized = normalizeText(fileName).toLowerCase();
  return normalized.replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-") || "avatar";
}

function createTransientSupabaseClient() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    TEMP_CLIENT_OPTIONS,
  );
}

function getDirectoryMap(rows) {
  return new Map(
    (Array.isArray(rows) ? rows : []).map((row) => [normalizeText(row?.id), row]),
  );
}

function mergeDirectoryData(profile, directoryEntry) {
  return {
    ...profile,
    status: normalizeText(directoryEntry?.status) || "offline",
    last_seen_at: directoryEntry?.last_seen_at || null,
    avatar_url:
      normalizeText(profile?.avatar_url) ||
      normalizeText(profile?.id_card_url) ||
      normalizeText(directoryEntry?.avatar_url),
    name:
      normalizeText(profile?.full_name) ||
      normalizeText(directoryEntry?.name) ||
      normalizeText(profile?.email) ||
      "Unnamed member",
    is_active: profile?.is_active !== false,
  };
}

function buildOwnFallbackProfile(sessionUser, currentUser = {}) {
  return {
    id: sessionUser.id,
    email: sessionUser.email || currentUser?.email || "",
    full_name:
      sessionUser.user_metadata?.full_name ||
      currentUser?.name ||
      sessionUser.email ||
      "Current user",
    first_name_en: sessionUser.user_metadata?.first_name_en || "",
    last_name_en: sessionUser.user_metadata?.last_name_en || "",
    employee_code:
      sessionUser.user_metadata?.employee_code ||
      sessionUser.user_metadata?.employee_id ||
      currentUser?.employeeId ||
      "",
    phone: sessionUser.user_metadata?.phone || currentUser?.phone || "",
    location:
      sessionUser.user_metadata?.location ||
      sessionUser.user_metadata?.work_location ||
      currentUser?.location ||
      "",
    department: sessionUser.user_metadata?.department || currentUser?.department || "",
    position: sessionUser.user_metadata?.position || currentUser?.position || "",
    avatar_url:
      sessionUser.user_metadata?.avatar_url ||
      sessionUser.user_metadata?.picture ||
      currentUser?.avatar ||
      "",
    role: normalizeRole(currentUser?.role || sessionUser.user_metadata?.role) || "it_support",
    is_active: currentUser?.isActive !== false,
    created_at: sessionUser.created_at,
  };
}

function buildProfilePayload(profile, { lockedEmail = "" } = {}) {
  const base = createProfileForm(profile);
  return {
    id: profile.id,
    email: normalizeText(lockedEmail || base.email).toLowerCase(),
    full_name: normalizeText(base.full_name),
    first_name_en: normalizeText(base.first_name_en),
    last_name_en: normalizeText(base.last_name_en),
    employee_code: normalizeText(base.employee_code).toUpperCase(),
    phone: normalizeText(base.phone),
    location: normalizeText(base.location),
    department: normalizeText(base.department),
    position: normalizeText(base.position),
    avatar_url: normalizeText(base.avatar_url),
    role: normalizeRole(base.role) || "user",
    is_active: base.is_active !== false,
  };
}

function isMissingProfileColumnError(error, columnName) {
  return (
    String(error?.code || "") === "PGRST204" &&
    String(error?.message || "").includes(`'${columnName}' column`)
  );
}

function buildCompatibleProfilePayload(payload, error) {
  let changed = false;
  const nextPayload = { ...payload };

  if (isMissingProfileColumnError(error, "avatar_url")) {
    nextPayload[LEGACY_PROFILE_AVATAR_COLUMN] = nextPayload.avatar_url || "";
    delete nextPayload.avatar_url;
    changed = true;
  }

  if (isMissingProfileColumnError(error, "is_active")) {
    delete nextPayload.is_active;
    changed = true;
  }

  return changed ? nextPayload : null;
}

async function upsertProfileWithCompatibility(payload) {
  let workingPayload = { ...payload };
  let attempts = 0;
  let lastError = null;

  while (attempts < 3) {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(workingPayload)
      .select("*")
      .maybeSingle();

    if (!error) {
      return data || workingPayload;
    }

    lastError = error;
    const compatiblePayload = buildCompatibleProfilePayload(workingPayload, error);
    if (!compatiblePayload) {
      throw mapAccountMutationError(error);
    }

    workingPayload = compatiblePayload;
    attempts += 1;
  }

  throw mapAccountMutationError(lastError);
}

function resolveStoragePathFromPublicUrl(bucketName, publicUrl) {
  const source = normalizeText(publicUrl);
  if (!source) return "";

  const marker = `/storage/v1/object/public/${bucketName}/`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return "";

  const relativePath = source.slice(markerIndex + marker.length);
  return decodeURIComponent(relativePath.split("?")[0] || "");
}

async function maybeRemoveStoredAvatar(publicUrl) {
  const storagePath = resolveStoragePathFromPublicUrl(PROFILE_AVATAR_BUCKET, publicUrl);
  if (!storagePath) return;

  const { error } = await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([storagePath]);
  if (error) {
    console.warn("Remove profile avatar warning:", error);
  }
}

async function uploadAvatarFile(memberId, file) {
  const originalFile = file instanceof File ? file : null;
  if (!originalFile) {
    throw new Error("Please choose an image file.");
  }
  if (!String(originalFile.type || "").startsWith(IMAGE_MIME_PREFIX)) {
    throw new Error("Profile image must be an image file.");
  }
  if (originalFile.size > PROFILE_AVATAR_MAX_SIZE_BYTES) {
    throw new Error("Profile image must be 3 MB or smaller.");
  }

  let processedFile = originalFile;
  try {
    processedFile = await imageCompression(originalFile, AVATAR_COMPRESSION_OPTIONS);
  } catch (error) {
    console.warn("Avatar compression warning:", error);
  }

  const extension = sanitizeFileName(processedFile.name).split(".").pop() || "jpg";
  const filePath = `${normalizeText(memberId)}/${Date.now()}-${sanitizeFileName(
    processedFile.name || `avatar.${extension}`,
  )}`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(filePath, processedFile, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(filePath);
  return {
    publicUrl: data?.publicUrl || "",
    path: filePath,
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the selected image file."));
    reader.readAsDataURL(file);
  });
}

export async function fetchAccountCenterData(currentUser = {}) {
  const [
    {
      data: { session },
    },
    { data: profileRows, error: profilesError },
    { data: directoryRows, error: directoryError },
  ] = await Promise.all([
    supabase.auth.getSession(),
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.rpc("get_user_directory"),
  ]);

  if (!session?.user) {
    throw new Error("No active session");
  }
  if (profilesError) {
    throw profilesError;
  }
  if (directoryError) {
    console.warn("Load account directory warning:", directoryError);
  }

  const rows = Array.isArray(profileRows) ? [...profileRows] : [];
  const directoryMap = getDirectoryMap(directoryRows);
  const ownIndex = rows.findIndex((item) => normalizeText(item?.id) === normalizeText(session.user.id));
  const ownProfile = ownIndex >= 0 ? rows[ownIndex] : buildOwnFallbackProfile(session.user, currentUser);

  if (ownIndex < 0) {
    rows.unshift(ownProfile);
  }

  return {
    sessionUser: session.user,
    currentUserId: normalizeText(session.user.id),
    ownProfile: mergeDirectoryData(ownProfile, directoryMap.get(normalizeText(ownProfile.id))),
    members: rows.map((row) => mergeDirectoryData(row, directoryMap.get(normalizeText(row?.id)))),
  };
}

export async function updateSelfAccount(sessionUser, currentRole, form) {
  assertValidAccountProfile(form, { requireWorkProfile: true });
  const payload = buildProfilePayload(
    {
      ...form,
      id: sessionUser.id,
      role: normalizeRole(currentRole || form.role) || "it_support",
    },
    { lockedEmail: form.email || sessionUser.email || "" },
  );
  await assertAccountIdentityAvailable(payload, sessionUser.id);

  const metadata = {
    full_name: payload.full_name,
    first_name_en: payload.first_name_en,
    last_name_en: payload.last_name_en,
    employee_code: payload.employee_code,
    phone: payload.phone,
    location: payload.location,
    department: payload.department,
    position: payload.position,
    role: payload.role,
    is_active: payload.is_active,
  };

  if (!payload.avatar_url.startsWith("data:") || payload.avatar_url.length <= INLINE_AVATAR_MAX_METADATA_LENGTH) {
    metadata.avatar_url = payload.avatar_url;
  }

  const authPayload =
    payload.email && payload.email !== normalizeText(sessionUser.email).toLowerCase()
      ? { email: payload.email, data: metadata }
      : { data: metadata };

  const { error: authError } = await supabase.auth.updateUser(authPayload);
  if (authError) {
    throw mapAccountMutationError(authError);
  }

  return upsertProfileWithCompatibility(payload);
}

export async function updateManagedAccount(memberId, email, form) {
  assertValidAccountProfile({ ...form, email }, { requireWorkProfile: true });
  const payload = buildProfilePayload(
    {
      ...form,
      id: memberId,
      email,
    },
    { lockedEmail: email },
  );
  await assertAccountIdentityAvailable(payload, memberId);

  return upsertProfileWithCompatibility(payload);
}

export async function updateMemberAccessState(memberId, isActive) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: Boolean(isActive) })
    .eq("id", memberId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createManagedAccount(profile, password) {
  const email = normalizeText(profile.email).toLowerCase();
  const employeeCode = normalizeText(profile.employee_code).toUpperCase();
  assertValidAccountProfile(
    { ...profile, email, employee_code: employeeCode },
    {
      requireWorkProfile: true,
      password,
      confirmPassword: profile?.confirmPassword,
      requirePassword: true,
    },
  );
  await assertAccountIdentityAvailable({ email, employee_code: employeeCode });

  const transientClient = createTransientSupabaseClient();
  const profilePayload = buildProfilePayload(
    {
      ...profile,
      employee_code: employeeCode,
      email,
      is_active: profile.is_active !== false,
    },
    { lockedEmail: email },
  );

  const { data: signUpData, error: signUpError } = await transientClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: profilePayload.full_name,
        first_name_en: profilePayload.first_name_en,
        last_name_en: profilePayload.last_name_en,
        phone: profilePayload.phone,
        location: profilePayload.location,
        employee_code: profilePayload.employee_code,
        department: profilePayload.department,
        position: profilePayload.position,
        role: profilePayload.role,
        is_active: profilePayload.is_active,
      },
    },
  });

  if (signUpError) {
    throw mapAccountMutationError(signUpError);
  }
  if (!signUpData?.user?.id) {
    throw new Error("Unable to create the new account.");
  }
  if (Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
    throw createDuplicateAccountError({ email: true });
  }

  const nextPayload = {
    ...profilePayload,
    id: signUpData.user.id,
  };

  return {
    user: signUpData.user,
    profile: await upsertProfileWithCompatibility(nextPayload),
  };
}

export async function uploadManagedAccountAvatar(memberId, file, previousUrl = "") {
  try {
    const uploadResult = await uploadAvatarFile(memberId, file);
    await maybeRemoveStoredAvatar(previousUrl);
    return uploadResult.publicUrl;
  } catch (error) {
    console.warn("Profile avatar storage upload failed, falling back to inline data URL:", error);
    return readFileAsDataUrl(file);
  }
}

export async function removeManagedAccountAvatar(memberId, email, form) {
  await maybeRemoveStoredAvatar(form.avatar_url);
  return updateManagedAccount(memberId, email, {
    ...form,
    avatar_url: "",
  });
}

export async function sendManagedPasswordReset(email) {
  const normalizedEmail = normalizeText(email).toLowerCase();
  if (!normalizedEmail) {
    throw new Error("This account does not have a usable email address.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: getPasswordResetRedirectUrl(),
  });

  if (error) {
    throw error;
  }

  return true;
}

export async function setManagedAccountPassword(memberId, nextPassword) {
  const targetUserId = normalizeText(memberId);
  const password = String(nextPassword || "");

  if (!targetUserId) {
    throw new Error("No member selected.");
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }

  const { error } = await supabase.rpc("set_managed_account_password", {
    _target_user_id: targetUserId,
    _next_password: password,
  });

  if (error) {
    throw error;
  }

  return true;
}

export async function deleteManagedProfileRecord(member) {
  if (!normalizeText(member?.id)) {
    throw new Error("No member selected.");
  }

  await maybeRemoveStoredAvatar(member?.avatar_url);

  const { error } = await supabase.from("profiles").delete().eq("id", member.id);
  if (error) {
    throw error;
  }

  return true;
}
