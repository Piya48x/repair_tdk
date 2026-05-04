const OPTIONAL_PROFILE_COLUMNS = new Set([
  "full_name",
  "role",
  "employee_code",
  "department",
  "avatar_url",
  "id_card_url",
  "email",
]);

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
  const safeIds = Array.isArray(ids)
    ? [...new Set(ids.map((value) => String(value || "").trim()).filter(Boolean))]
    : [];
  let selectedColumns = [...new Set(["id", ...columns.filter(Boolean)])];
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

    selectedColumns = selectedColumns.filter((column) => column !== missingColumn);
  }

  return { data: [], error: lastError, columns: selectedColumns };
}
