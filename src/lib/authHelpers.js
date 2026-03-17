const LEGACY_EMPLOYEE_EMAIL_DOMAIN = "company.local";

export async function resolveEmailFromIdentifier(
  supabaseClient,
  rawIdentifier,
  { allowLegacyFallback = true } = {},
) {
  const identifier = String(rawIdentifier || "").trim();

  if (!identifier) {
    throw new Error("กรุณากรอกอีเมลหรือรหัสพนักงาน");
  }

  if (identifier.includes("@")) {
    return identifier.toLowerCase();
  }

  const employeeCode = identifier.toUpperCase();
  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("email")
    .eq("employee_code", employeeCode)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (profile?.email) {
    return profile.email;
  }

  if (allowLegacyFallback && /^\d+$/.test(identifier)) {
    return `emp_${identifier.toLowerCase()}@${LEGACY_EMPLOYEE_EMAIL_DOMAIN}`;
  }

  throw new Error("ไม่พบอีเมลที่เชื่อมกับรหัสพนักงานนี้");
}

export function getPasswordResetRedirectUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.origin}/reset-password`;
}
