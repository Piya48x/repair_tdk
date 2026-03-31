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
      throw error;
    }

    workingPayload = compatiblePayload;
    attempts += 1;
  }

  throw lastError;
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
  const payload = buildProfilePayload(
    {
      ...form,
      id: sessionUser.id,
      role: normalizeRole(currentRole || form.role) || "it_support",
    },
    { lockedEmail: form.email || sessionUser.email || "" },
  );

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
    throw authError;
  }

  return upsertProfileWithCompatibility(payload);
}

export async function updateManagedAccount(memberId, email, form) {
  const payload = buildProfilePayload(
    {
      ...form,
      id: memberId,
      email,
    },
    { lockedEmail: email },
  );

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

  if (!email) {
    throw new Error("Email is required.");
  }
  if (!employeeCode) {
    throw new Error("Employee code is required.");
  }
  if (normalizeText(password).length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }

  const [
    { data: existingEmail, error: existingEmailError },
    { data: existingEmployee, error: existingEmployeeError },
  ] = await Promise.all([
    supabase.from("profiles").select("id").eq("email", email).maybeSingle(),
    supabase.from("profiles").select("id").eq("employee_code", employeeCode).maybeSingle(),
  ]);

  if (existingEmailError) throw existingEmailError;
  if (existingEmployeeError) throw existingEmployeeError;
  if (existingEmail) {
    throw new Error("This email is already linked to an existing member.");
  }
  if (existingEmployee) {
    throw new Error("This employee code is already linked to an existing member.");
  }

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
    throw signUpError;
  }
  if (!signUpData?.user?.id) {
    throw new Error("Unable to create the new account.");
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
