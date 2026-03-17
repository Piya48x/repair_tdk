const OPTIONAL_MEETING_BOOKING_COLUMNS = new Set([
  "created_by",
  "meeting_summary",
  "meeting_decisions",
  "action_items",
  "minutes_submitted_at",
  "updated_at",
]);

function extractMissingMeetingBookingColumn(error) {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`;
  const fromSchemaCache = text.match(
    /Could not find the '([^']+)' column of 'meeting_room_bookings' in the schema cache/i,
  );
  if (fromSchemaCache?.[1]) return fromSchemaCache[1];

  const fromPostgres = text.match(
    /column ["']?([^"'\s]+)["']? of relation ["']?meeting_room_bookings["']? does not exist/i,
  );
  if (fromPostgres?.[1]) return fromPostgres[1];

  return "";
}

export async function insertMeetingRoomBookingWithSchemaFallback(
  supabaseClient,
  payload,
  options = {},
) {
  const { select = "*", single = false, maxRetries = 6 } = options;
  let workingPayload = { ...(payload || {}) };
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    let query = supabaseClient.from("meeting_room_bookings").insert(workingPayload).select(select);
    if (single) query = query.single();

    const { data, error } = await query;
    if (!error) {
      return { data, error: null, payload: workingPayload };
    }

    lastError = error;
    const missingColumn = extractMissingMeetingBookingColumn(error);
    if (!missingColumn || !OPTIONAL_MEETING_BOOKING_COLUMNS.has(missingColumn)) {
      break;
    }
    if (!(missingColumn in workingPayload)) {
      break;
    }
    delete workingPayload[missingColumn];
  }

  return { data: null, error: lastError, payload: workingPayload };
}

export async function updateMeetingRoomBookingWithSchemaFallback(
  supabaseClient,
  bookingId,
  payload,
  options = {},
) {
  const { select = "*", single = false, maxRetries = 6 } = options;
  let workingPayload = { ...(payload || {}) };
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    let query = supabaseClient
      .from("meeting_room_bookings")
      .update(workingPayload)
      .eq("id", bookingId)
      .select(select);

    if (single) query = query.single();

    const { data, error } = await query;
    if (!error) {
      return { data, error: null, payload: workingPayload };
    }

    lastError = error;
    const missingColumn = extractMissingMeetingBookingColumn(error);
    if (!missingColumn || !OPTIONAL_MEETING_BOOKING_COLUMNS.has(missingColumn)) {
      break;
    }
    if (!(missingColumn in workingPayload)) {
      break;
    }
    delete workingPayload[missingColumn];
  }

  return { data: null, error: lastError, payload: workingPayload };
}
