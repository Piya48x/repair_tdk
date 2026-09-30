import { supabase } from "../lib/supabaseClient";

const SELECT_COLUMNS = [
  "id",
  "visit_date",
  "entry_time",
  "exit_date",
  "exit_time",
  "pass_type",
  "source_group_name",
  "gatepass_number",
  "vehicle_plate",
  "province",
  "vehicle_type",
  "driver_name",
  "company_name",
  "contact_person",
  "department",
  "purpose",
  "telephone_number",
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
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    (message.includes("gatepass_vehicle_records") &&
      (message.includes("does not exist") || message.includes("schema cache")))
  );
}

export async function fetchGatepassVehicleRecords({ from, to, limit } = {}) {
  const createQuery = () => {
    let query = supabase
      .from("gatepass_vehicle_records")
      .select(SELECT_COLUMNS)
      .order("visit_date", { ascending: false })
      .order("entry_time", { ascending: false })
      .order("id", { ascending: false });

    if (from) query = query.gte("visit_date", from);
    if (to) query = query.lte("visit_date", to);
    return query;
  };

  if (Number.isFinite(limit) && limit > 0) {
    const { data, error } = await createQuery().limit(limit);
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  const pageSize = 1000;
  const records = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await createQuery().range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = Array.isArray(data) ? data : [];
    records.push(...page);
    if (page.length < pageSize) break;
  }
  return records;
}
