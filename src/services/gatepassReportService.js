import { supabase } from "../lib/supabaseClient";

const SELECT_COLUMNS = [
  "id",
  "visit_date",
  "entry_time",
  "exit_time",
  "pass_type",
  "gatepass_number",
  "vehicle_plate",
  "province",
  "vehicle_type",
  "driver_name",
  "company_name",
  "contact_person",
  "department",
  "purpose",
  "gate_name",
  "approval_reference",
  "notes",
  "created_at",
  "updated_at",
].join(",");

export function isGatepassSchemaMissing(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (message.includes("gatepass_vehicle_records") &&
      (message.includes("does not exist") || message.includes("schema cache")))
  );
}

export async function fetchGatepassVehicleRecords({ from, to }) {
  let query = supabase
    .from("gatepass_vehicle_records")
    .select(SELECT_COLUMNS)
    .order("visit_date", { ascending: false })
    .order("entry_time", { ascending: false });

  if (from) query = query.gte("visit_date", from);
  if (to) query = query.lte("visit_date", to);

  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}
