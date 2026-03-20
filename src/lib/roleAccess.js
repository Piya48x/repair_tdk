export const ROLES = {
  USER: "user",
  IT_SUPPORT: "it_support",
  ADMIN: "admin",
  AUDITOR: "auditor",
  IT_MANAGER: "it_manager",
  EXECUTIVE: "executive",
};

export const REPORT_ROUTE_PERMISSIONS = {
  it: [ROLES.IT_MANAGER, ROLES.ADMIN],
  executive: [ROLES.EXECUTIVE, ROLES.ADMIN],
  index: [ROLES.IT_MANAGER, ROLES.EXECUTIVE, ROLES.ADMIN],
};

export const ROLE_HOME_ROUTES = {
  [ROLES.USER]: "/dashboard",
  [ROLES.IT_SUPPORT]: "/admin-dashboard",
  [ROLES.ADMIN]: "/admin-dashboard",
  [ROLES.AUDITOR]: "/audit-view",
  [ROLES.IT_MANAGER]: "/reports/it",
  [ROLES.EXECUTIVE]: "/reports/executive",
};

export const normalizeRole = (role) => String(role || "").trim().toLowerCase();

export const canAccessRoute = (role, allowedRoles = []) => {
  const normalizedRole = normalizeRole(role);
  const normalizedAllowed = (allowedRoles || []).map(normalizeRole);
  return normalizedAllowed.includes(normalizedRole);
};

export const resolveHomeRoute = (role) => {
  const normalizedRole = normalizeRole(role);
  return ROLE_HOME_ROUTES[normalizedRole] || "/dashboard";
};
