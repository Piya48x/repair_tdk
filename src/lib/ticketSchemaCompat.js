const OPTIONAL_TICKET_COLUMNS = new Set([
  "creator_id",
  "created_by",
  "attachments",
  "channel",
  "start_time",
  "started_at",
  "end_time",
  "image_after_url",
  "resolution_note",
  "solution_note",
  "reporter_emp_id",
  "reporter_dept",
  "reporter_avatar_url",
  "assigned_avatar_url",
  "assigned_employee_id",
  "asset_id",
  "asset_code",
]);

function extractMissingTicketColumn(error) {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`;
  const fromSchemaCache = text.match(
    /Could not find the '([^']+)' column of 'tickets' in the schema cache/i,
  );
  if (fromSchemaCache?.[1]) return fromSchemaCache[1];

  const fromPostgres = text.match(
    /column ["']?([^"'\s]+)["']? of relation ["']?tickets["']? does not exist/i,
  );
  if (fromPostgres?.[1]) return fromPostgres[1];

  return "";
}

export async function insertTicketWithSchemaFallback(
  supabaseClient,
  payload,
  options = {},
) {
  const { select = "*", single = false, maxRetries = 5 } = options;
  let workingPayload = { ...(payload || {}) };
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    let query = supabaseClient.from("tickets").insert(workingPayload).select(select);
    if (single) query = query.single();

    const { data, error } = await query;
    if (!error) {
      return { data, error: null, payload: workingPayload };
    }

    lastError = error;
    const missingColumn = extractMissingTicketColumn(error);
    if (!missingColumn || !OPTIONAL_TICKET_COLUMNS.has(missingColumn)) {
      break;
    }
    if (!(missingColumn in workingPayload)) {
      break;
    }
    delete workingPayload[missingColumn];
  }

  return { data: null, error: lastError, payload: workingPayload };
}

export async function updateTicketWithSchemaFallback(
  supabaseClient,
  ticketId,
  payload,
  options = {},
) {
  const { select = "", single = false, maxRetries = 5 } = options;
  let workingPayload = { ...(payload || {}) };
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    let query = supabaseClient.from("tickets").update(workingPayload).eq("id", ticketId);
    if (select) {
      query = query.select(select);
      if (single) query = query.single();
    }

    const { data, error } = await query;
    if (!error) {
      return { data: data || null, error: null, payload: workingPayload };
    }

    lastError = error;
    const missingColumn = extractMissingTicketColumn(error);
    if (!missingColumn || !OPTIONAL_TICKET_COLUMNS.has(missingColumn)) {
      break;
    }
    if (!(missingColumn in workingPayload)) {
      break;
    }
    delete workingPayload[missingColumn];
  }

  return { data: null, error: lastError, payload: workingPayload };
}
