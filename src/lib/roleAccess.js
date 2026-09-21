export const ROLES = {
  USER: "user",
  IT_SUPPORT: "it_support",
  ADMIN: "admin",
  AUDITOR: "auditor",
  IT_MANAGER: "it_manager",
  EXECUTIVE: "executive",
  SECURITY: "security",
};

export const REPORT_ROUTE_PERMISSIONS = {
  it: [ROLES.IT_MANAGER, ROLES.ADMIN],
  executive: [ROLES.IT_MANAGER, ROLES.EXECUTIVE, ROLES.ADMIN],
  notebookApprovals: [ROLES.EXECUTIVE, ROLES.ADMIN],
  gatepass: [ROLES.IT_SUPPORT, ROLES.IT_MANAGER, ROLES.EXECUTIVE, ROLES.SECURITY, ROLES.AUDITOR, ROLES.ADMIN],
  index: [ROLES.IT_MANAGER, ROLES.EXECUTIVE, ROLES.ADMIN],
};

export const ROLE_HOME_ROUTES = {
  [ROLES.USER]: "/dashboard",
  [ROLES.IT_SUPPORT]: "/admin-dashboard",
  [ROLES.ADMIN]: "/admin-dashboard",
  [ROLES.AUDITOR]: "/audit-view",
  [ROLES.IT_MANAGER]: "/reports/it",
  [ROLES.EXECUTIVE]: "/reports",
  [ROLES.SECURITY]: "/reports/gatepass",
};

export const ROLE_WORKSPACE_ROUTES = {
  [ROLES.USER]: "/dashboard",
  [ROLES.IT_SUPPORT]: "/admin-dashboard",
  [ROLES.ADMIN]: "/admin-dashboard",
  [ROLES.AUDITOR]: "/audit-view",
  [ROLES.IT_MANAGER]: "/dashboard",
  [ROLES.EXECUTIVE]: "/dashboard",
  [ROLES.SECURITY]: "/reports/gatepass",
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

export const resolveWorkspaceRoute = (role) => {
  const normalizedRole = normalizeRole(role);
  return ROLE_WORKSPACE_ROUTES[normalizedRole] || "/dashboard";
};
