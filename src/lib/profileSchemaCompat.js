const OPTIONAL_PROFILE_COLUMNS = new Set([
  "full_name",
  "role",
  "employee_code",
  "department",
  "avatar_url",
  "id_card_url",
  "email",
]);

const PROFILE_COMPAT_SESSION_KEY = "__profile_compat_missing_columns__";
const unsupportedProfileColumns = new Set();

function hydrateUnsupportedColumnsFromSession() {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  if (unsupportedProfileColumns.size > 0) return;

  try {
    const raw = window.sessionStorage.getItem(PROFILE_COMPAT_SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    parsed
      .map((value) => normalizeColumnName(value))
      .filter((value) => OPTIONAL_PROFILE_COLUMNS.has(value))
      .forEach((value) => unsupportedProfileColumns.add(value));
  } catch {
    // Ignore cache hydration failures.
  }
}

function rememberUnsupportedColumn(columnName) {
  const normalized = normalizeColumnName(columnName);
  if (!OPTIONAL_PROFILE_COLUMNS.has(normalized)) return;

  unsupportedProfileColumns.add(normalized);

  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(
      PROFILE_COMPAT_SESSION_KEY,
      JSON.stringify(Array.from(unsupportedProfileColumns)),
    );
  } catch {
    // Ignore cache persistence failures.
  }
}

function normalizeColumnName(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^profiles\./i, "")
    .replace(/^public\.profiles\./i, "");
}

export function extractMissingProfileColumn(error) {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`;

  const fromSchemaCache = text.match(
    /Could not find the '([^']+)' column of 'profiles' in the schema cache/i,
  );
  if (fromSchemaCache?.[1]) {
    return normalizeColumnName(fromSchemaCache[1]);
  }

  const directMissing = text.match(
    /column\s+((?:"?public"?\.)?"?profiles"?\.[^ "'\s]+|[^ "'\s]+)\s+does not exist/i,
  );
  if (directMissing?.[1]) {
    return normalizeColumnName(directMissing[1]);
  }

  const fromRelation = text.match(
    /column ["']?([^"'\s]+)["']? of relation ["']?profiles["']? does not exist/i,
  );
  if (fromRelation?.[1]) {
    return normalizeColumnName(fromRelation[1]);
  }

  return "";
}

export async function fetchProfilesWithCompatibility(
  supabaseClient,
  {
    ids = [],
    columns = ["id", "full_name"],
    orderBy = "",
    ascending = false,
  } = {},
) {
  hydrateUnsupportedColumnsFromSession();

  const safeIds = Array.isArray(ids)
    ? [...new Set(ids.map((value) => String(value || "").trim()).filter(Boolean))]
    : [];
  let selectedColumns = [...new Set(["id", ...columns.filter(Boolean)])].filter(
    (column) => !unsupportedProfileColumns.has(normalizeColumnName(column)),
  );
  let lastError = null;

  if (ids && safeIds.length === 0) {
    return { data: [], error: null, columns: selectedColumns };
  }

  for (let attempt = 0; attempt <= selectedColumns.length; attempt += 1) {
    let query = supabaseClient.from("profiles").select(selectedColumns.join(", "));

    if (safeIds.length > 0) {
      query = query.in("id", safeIds);
    }

    if (orderBy) {
      query = query.order(orderBy, { ascending });
    }

    const { data, error } = await query;
    if (!error) {
      return {
        data: Array.isArray(data) ? data : [],
        error: null,
        columns: selectedColumns,
      };
    }

    lastError = error;
    const missingColumn = extractMissingProfileColumn(error);
    if (
      !missingColumn ||
      !OPTIONAL_PROFILE_COLUMNS.has(missingColumn) ||
      !selectedColumns.includes(missingColumn)
    ) {
      break;
    }

    rememberUnsupportedColumn(missingColumn);
    selectedColumns = selectedColumns.filter((column) => column !== missingColumn);
  }

  return { data: [], error: lastError, columns: selectedColumns };
}
