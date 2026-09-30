const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024;
const DEFAULT_MANAGED_FILE_BYTES = 20 * 1024 * 1024;
const DEFAULT_SIGNED_URL_TTL_SECONDS = 15 * 60;
const ALLOWED_ATTACHMENT_KINDS = new Set(["before", "after", "chat", "general"]);
const MANAGED_FILE_SCOPES = new Set(["stock-files", "it-assets", "asset-audits", "asset-moves"]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function getAllowedOrigins(env) {
  return normalizeText(env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN)
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function getCorsHeaders(request, env) {
  const origin = normalizeText(request.headers.get("Origin")).replace(/\/$/, "");
  const allowedOrigins = getAllowedOrigins(env);
  const allowOrigin = allowedOrigins.includes("*")
    ? "*"
    : allowedOrigins.includes(origin)
      ? origin
      : "";

  const headers = {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (allowOrigin) headers["Access-Control-Allow-Origin"] = allowOrigin;
  return headers;
}

function json(request, env, payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...getCorsHeaders(request, env),
      ...extraHeaders,
    },
  });
}

function sanitizePathSegment(value, fallback = "file") {
  const normalized = normalizeText(value)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return normalized || fallback;
}

function getBearerToken(request) {
  const authorization = normalizeText(request.headers.get("Authorization"));
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

function requireConfiguration(env) {
  const missing = [];
  if (!env.TICKET_HISTORY) missing.push("TICKET_HISTORY binding");
  if (!normalizeText(env.SUPABASE_URL)) missing.push("SUPABASE_URL");
  if (!normalizeText(env.SUPABASE_ANON_KEY)) missing.push("SUPABASE_ANON_KEY");
  if (!normalizeText(env.FILE_SIGNING_SECRET)) missing.push("FILE_SIGNING_SECRET");
  return missing;
}

async function authenticate(request, env) {
  const token = getBearerToken(request);
  if (!token) return null;

  const response = await fetch(`${normalizeText(env.SUPABASE_URL).replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: normalizeText(env.SUPABASE_ANON_KEY),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  const user = await response.json();
  return user?.id ? { token, user } : null;
}

async function canAccessTicket(ticketId, auth, env) {
  const normalizedTicketId = normalizeText(ticketId);
  if (!normalizedTicketId) return false;

  const endpoint = new URL(`${normalizeText(env.SUPABASE_URL).replace(/\/$/, "")}/rest/v1/tickets`);
  endpoint.searchParams.set("id", `eq.${normalizedTicketId}`);
  endpoint.searchParams.set("select", "id");
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      apikey: normalizeText(env.SUPABASE_ANON_KEY),
      Authorization: `Bearer ${auth.token}`,
    },
  });

  if (!response.ok) return false;
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0;
}

function ticketIdFromObjectKey(key) {
  const parts = normalizeText(key).split("/").filter(Boolean);
  if (parts.length < 3) return "";
  if (parts[0] !== "tickets" && parts[0] !== "history") return "";
  return parts[1];
}

function isCapabilityObjectKey(key) {
  const parts = normalizeText(key).split("/").filter(Boolean);
  if (parts.length < 3) return false;
  return ["tickets", "history", "it-work-records", ...MANAGED_FILE_SCOPES].includes(parts[0]);
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createSignature(key, expiresAt, env) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(normalizeText(env.FILE_SIGNING_SECRET)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(`${key}\n${expiresAt}`),
  );
  return bytesToBase64Url(signature);
}

function constantTimeEqual(left, right) {
  const a = normalizeText(left);
  const b = normalizeText(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

async function buildSignedFileUrl(request, key, env) {
  const configuredTtl = Number(env.SIGNED_URL_TTL_SECONDS || DEFAULT_SIGNED_URL_TTL_SECONDS);
  const ttl = Math.min(Math.max(Number.isFinite(configuredTtl) ? configuredTtl : DEFAULT_SIGNED_URL_TTL_SECONDS, 60), 3600);
  const expiresAt = Math.floor(Date.now() / 1000) + ttl;
  const signature = await createSignature(key, expiresAt, env);
  const url = new URL(request.url);
  url.pathname = "/file";
  url.search = "";
  url.searchParams.set("key", key);
  url.searchParams.set("expires", String(expiresAt));
  url.searchParams.set("signature", signature);
  return url.toString();
}

async function buildCapabilityFileUrl(request, key, env) {
  const signature = await createSignature(key, "asset", env);
  const url = new URL(request.url);
  url.pathname = "/asset";
  url.search = "";
  url.searchParams.set("key", key);
  url.searchParams.set("signature", signature);
  return url.toString();
}

async function handleCapabilityFile(request, env) {
  const url = new URL(request.url);
  const key = normalizeText(url.searchParams.get("key"));
  const suppliedSignature = normalizeText(url.searchParams.get("signature"));

  if (!key || !isCapabilityObjectKey(key)) {
    return new Response("Invalid file link", { status: 403 });
  }

  const expectedSignature = await createSignature(key, "asset", env);
  if (!constantTimeEqual(suppliedSignature, expectedSignature)) {
    return new Response("Invalid signature", { status: 403 });
  }

  const object = await env.TICKET_HISTORY.get(key);
  if (!object) return new Response("File not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "private, max-age=3600");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}

async function canManageITWork(auth, env) {
  const endpoint = new URL(`${normalizeText(env.SUPABASE_URL).replace(/\/$/, "")}/rest/v1/profiles`);
  endpoint.searchParams.set("id", `eq.${auth.user.id}`);
  endpoint.searchParams.set("select", "role");
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      apikey: normalizeText(env.SUPABASE_ANON_KEY),
      Authorization: `Bearer ${auth.token}`,
    },
  });

  if (!response.ok) return false;
  const rows = await response.json();
  const role = normalizeText(rows?.[0]?.role).toLowerCase();
  return ["admin", "it_support", "it_manager"].includes(role);
}

async function handleITWorkUpload(request, env, auth) {
  if (!(await canManageITWork(auth, env))) {
    return json(request, env, { error: "IT work evidence access denied" }, 403);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const recordKey = sanitizePathSegment(formData.get("recordKey"), "draft");

  if (!file || typeof file.arrayBuffer !== "function") {
    return json(request, env, { error: "file is required" }, 400);
  }

  const maxBytes = Number(env.MAX_FILE_BYTES || DEFAULT_MAX_FILE_BYTES);
  if (Number(file.size || 0) > maxBytes) {
    return json(request, env, { error: `File exceeds ${maxBytes} bytes` }, 413);
  }

  const fileName = sanitizePathSegment(file.name, "evidence.jpg");
  const objectKey = `it-work-records/${sanitizePathSegment(auth.user.id, "unknown")}/${recordKey}/${crypto.randomUUID()}-${fileName}`;
  const contentType = normalizeText(file.type) || "application/octet-stream";

  await env.TICKET_HISTORY.put(objectKey, file.stream(), {
    httpMetadata: { contentType },
    customMetadata: {
      recordKey,
      originalName: normalizeText(file.name).slice(0, 500),
      uploadedBy: auth.user.id,
    },
  });

  return json(request, env, {
    objectKey,
    fileName: normalizeText(file.name) || fileName,
    mimeType: contentType,
    size: Number(file.size || 0),
    permanentUrl: await buildCapabilityFileUrl(request, objectKey, env),
  }, 201);
}

async function handleITWorkDelete(request, env, auth) {
  if (!(await canManageITWork(auth, env))) {
    return json(request, env, { error: "IT work evidence access denied" }, 403);
  }

  const payload = await request.json();
  const objectKeys = [...new Set(
    (Array.isArray(payload?.objectKeys) ? payload.objectKeys : [payload?.objectKey])
      .map(normalizeText)
      .filter((key) => key.startsWith("it-work-records/")),
  )].slice(0, 100);

  if (objectKeys.length === 0) {
    return json(request, env, { error: "Valid objectKey is required" }, 400);
  }

  await env.TICKET_HISTORY.delete(objectKeys);
  return json(request, env, { deleted: objectKeys.length });
}

async function handleManagedUpload(request, env, auth) {
  if (!(await canManageITWork(auth, env))) {
    return json(request, env, { error: "Managed file access denied" }, 403);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const scope = normalizeText(formData.get("scope")).toLowerCase();
  const recordKey = sanitizePathSegment(formData.get("recordKey"), "draft");
  const kind = sanitizePathSegment(formData.get("kind"), "general");

  if (!MANAGED_FILE_SCOPES.has(scope)) {
    return json(request, env, { error: "Invalid managed file scope" }, 400);
  }
  if (!file || typeof file.arrayBuffer !== "function") {
    return json(request, env, { error: "file is required" }, 400);
  }

  const configuredMax = Number(env.MANAGED_MAX_FILE_BYTES || DEFAULT_MANAGED_FILE_BYTES);
  const maxBytes = Number.isFinite(configuredMax) && configuredMax > 0
    ? configuredMax
    : DEFAULT_MANAGED_FILE_BYTES;
  if (Number(file.size || 0) > maxBytes) {
    return json(request, env, { error: `File exceeds ${maxBytes} bytes` }, 413);
  }

  const fileName = sanitizePathSegment(file.name, "attachment");
  const objectKey = `${scope}/${sanitizePathSegment(auth.user.id, "unknown")}/${recordKey}/${kind}/${crypto.randomUUID()}-${fileName}`;
  const contentType = normalizeText(file.type) || "application/octet-stream";

  await env.TICKET_HISTORY.put(objectKey, file.stream(), {
    httpMetadata: { contentType },
    customMetadata: {
      scope,
      recordKey,
      kind,
      originalName: normalizeText(file.name).slice(0, 500),
      uploadedBy: auth.user.id,
    },
  });

  return json(request, env, {
    objectKey,
    fileName: normalizeText(file.name) || fileName,
    mimeType: contentType,
    size: Number(file.size || 0),
    permanentUrl: await buildCapabilityFileUrl(request, objectKey, env),
  }, 201);
}

async function handleManagedDelete(request, env, auth) {
  if (!(await canManageITWork(auth, env))) {
    return json(request, env, { error: "Managed file access denied" }, 403);
  }

  const payload = await request.json();
  const objectKeys = [...new Set(
    (Array.isArray(payload?.objectKeys) ? payload.objectKeys : [payload?.objectKey])
      .map(normalizeText)
      .filter((key) => MANAGED_FILE_SCOPES.has(key.split("/")[0])),
  )].slice(0, 100);

  if (objectKeys.length === 0) {
    return json(request, env, { error: "Valid objectKey is required" }, 400);
  }

  await env.TICKET_HISTORY.delete(objectKeys);
  return json(request, env, { deleted: objectKeys.length });
}

async function handleSignedFile(request, env) {
  const url = new URL(request.url);
  const key = normalizeText(url.searchParams.get("key"));
  const expiresAt = Number(url.searchParams.get("expires"));
  const suppliedSignature = normalizeText(url.searchParams.get("signature"));

  if (!key || !Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return new Response("Link expired or invalid", { status: 403 });
  }

  const expectedSignature = await createSignature(key, expiresAt, env);
  if (!constantTimeEqual(suppliedSignature, expectedSignature)) {
    return new Response("Invalid signature", { status: 403 });
  }

  const object = await env.TICKET_HISTORY.get(key);
  if (!object) return new Response("File not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "private, max-age=60");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}

async function handleUpload(request, env, auth) {
  const formData = await request.formData();
  const file = formData.get("file");
  const ticketId = normalizeText(formData.get("ticketId"));
  const requestedKind = normalizeText(formData.get("kind")).toLowerCase() || "general";
  const kind = ALLOWED_ATTACHMENT_KINDS.has(requestedKind) ? requestedKind : "general";

  if (!file || typeof file.arrayBuffer !== "function") {
    return json(request, env, { error: "file is required" }, 400);
  }
  if (!ticketId) return json(request, env, { error: "ticketId is required" }, 400);
  if (!(await canAccessTicket(ticketId, auth, env))) {
    return json(request, env, { error: "Ticket not found or access denied" }, 403);
  }

  const maxBytes = Number(env.MAX_FILE_BYTES || DEFAULT_MAX_FILE_BYTES);
  if (Number(file.size || 0) > maxBytes) {
    return json(request, env, { error: `File exceeds ${maxBytes} bytes` }, 413);
  }

  const fileName = sanitizePathSegment(file.name, "attachment");
  const objectKey = `tickets/${sanitizePathSegment(ticketId, "unknown")}/${kind}/${crypto.randomUUID()}-${fileName}`;
  const contentType = normalizeText(file.type) || "application/octet-stream";

  await env.TICKET_HISTORY.put(objectKey, file.stream(), {
    httpMetadata: { contentType },
    customMetadata: {
      ticketId,
      kind,
      originalName: normalizeText(file.name).slice(0, 500),
      uploadedBy: auth.user.id,
    },
  });

  return json(request, env, {
    objectKey,
    fileName: normalizeText(file.name) || fileName,
    mimeType: contentType,
    size: Number(file.size || 0),
    kind,
    permanentUrl: await buildCapabilityFileUrl(request, objectKey, env),
    url: await buildSignedFileUrl(request, objectKey, env),
  }, 201);
}

async function handleArchive(request, env, auth) {
  const payload = await request.json();
  const ticketId = normalizeText(payload?.ticketId);
  const record = payload?.record;

  if (!ticketId || !record || typeof record !== "object" || Array.isArray(record)) {
    return json(request, env, { error: "ticketId and record object are required" }, 400);
  }
  if (!(await canAccessTicket(ticketId, auth, env))) {
    return json(request, env, { error: "Ticket not found or access denied" }, 403);
  }

  const objectKey = `history/${sanitizePathSegment(ticketId, "unknown")}/record.json`;
  const archive = {
    schemaVersion: 1,
    ticketId,
    archivedAt: new Date().toISOString(),
    archivedBy: auth.user.id,
    record,
  };

  await env.TICKET_HISTORY.put(objectKey, JSON.stringify(archive), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    customMetadata: { ticketId, archivedBy: auth.user.id },
  });

  return json(request, env, {
    objectKey,
    archivedAt: archive.archivedAt,
    url: await buildSignedFileUrl(request, objectKey, env),
  }, 201);
}

async function handleSign(request, env, auth) {
  const payload = await request.json();
  const key = normalizeText(payload?.objectKey || payload?.key);
  const ticketId = ticketIdFromObjectKey(key);

  if (!key || !ticketId) return json(request, env, { error: "Valid objectKey is required" }, 400);
  if (!(await canAccessTicket(ticketId, auth, env))) {
    return json(request, env, { error: "Ticket not found or access denied" }, 403);
  }

  const object = await env.TICKET_HISTORY.head(key);
  if (!object) return json(request, env, { error: "Object not found" }, 404);

  return json(request, env, { objectKey: key, url: await buildSignedFileUrl(request, key, env) });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: getCorsHeaders(request, env) });
    }

    const url = new URL(request.url);
    const missingConfiguration = requireConfiguration(env);
    if (missingConfiguration.length > 0) {
      return json(request, env, { error: "Worker configuration is incomplete", missing: missingConfiguration }, 503);
    }

    try {
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
        return json(request, env, { ok: true, service: "ticket-history-api" });
      }
      if (request.method === "GET" && url.pathname === "/file") {
        return handleSignedFile(request, env);
      }
      if (request.method === "GET" && url.pathname === "/asset") {
        return handleCapabilityFile(request, env);
      }

      const auth = await authenticate(request, env);
      if (!auth) return json(request, env, { error: "Unauthorized" }, 401);

      if (request.method === "POST" && url.pathname === "/upload") {
        return handleUpload(request, env, auth);
      }
      if (request.method === "POST" && url.pathname === "/archive") {
        return handleArchive(request, env, auth);
      }
      if (request.method === "POST" && url.pathname === "/sign") {
        return handleSign(request, env, auth);
      }
      if (request.method === "POST" && url.pathname === "/it-work/upload") {
        return handleITWorkUpload(request, env, auth);
      }
      if (request.method === "DELETE" && url.pathname === "/it-work/files") {
        return handleITWorkDelete(request, env, auth);
      }
      if (request.method === "POST" && url.pathname === "/managed/upload") {
        return handleManagedUpload(request, env, auth);
      }
      if (request.method === "DELETE" && url.pathname === "/managed/files") {
        return handleManagedDelete(request, env, auth);
      }

      return json(request, env, { error: "Not found" }, 404);
    } catch (error) {
      console.error("ticket-history-api error", error);
      return json(request, env, { error: "Internal server error" }, 500);
    }
  },
};
