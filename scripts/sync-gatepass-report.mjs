import { createHash } from "node:crypto";
import { access, mkdir, open, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const statePath = path.join(projectDirectory, ".gatepass-sync-state.json");
const lockPath = path.join(projectDirectory, ".gatepass-sync.lock");
const logDirectory = path.join(projectDirectory, "logs");
const logPath = path.join(logDirectory, "gatepass-sync.log");
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const reportFileNamePattern = /^report Car in Day .+\.xlsx$/i;

function parseEnvValue(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2
    && ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) return trimmed.slice(1, -1);
  return trimmed;
}

async function loadEnvFile(filePath) {
  try {
    const contents = await readFile(filePath, "utf8");
    for (const sourceLine of contents.split(/\r?\n/)) {
      const line = sourceLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator <= 0) continue;
      const key = line.slice(0, separator).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] != null) continue;
      process.env[key] = parseEnvValue(line.slice(separator + 1));
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function log(message, details) {
  const suffix = details == null ? "" : ` ${JSON.stringify(details)}`;
  const line = `[${new Date().toISOString()}] ${message}${suffix}`;
  console.log(line);
  await mkdir(logDirectory, { recursive: true });
  await writeFile(logPath, `${line}\n`, { encoding: "utf8", flag: "a" });
}

async function readState() {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof SyntaxError) return {};
    throw error;
  }
}

async function acquireLock() {
  try {
    return await open(lockPath, "wx");
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const lockStat = await stat(lockPath).catch(() => null);
    if (lockStat && Date.now() - lockStat.mtimeMs > 2 * 60 * 60 * 1000) {
      await rm(lockPath, { force: true });
      return open(lockPath, "wx");
    }
    throw new Error("Gatepass sync is already running");
  }
}

async function findLatestReportFile(directoryPath) {
  const directoryEntries = await readdir(directoryPath, { withFileTypes: true });
  const candidates = await Promise.all(
    directoryEntries
      .filter((entry) => entry.isFile() && !entry.name.startsWith("~$") && reportFileNamePattern.test(entry.name))
      .map(async (entry) => {
        const filePath = path.join(directoryPath, entry.name);
        const fileStat = await stat(filePath);
        return { filePath, fileName: entry.name, modifiedAt: fileStat.mtimeMs };
      }),
  );

  candidates.sort((left, right) => right.modifiedAt - left.modifiedAt || right.fileName.localeCompare(left.fileName));
  return candidates[0]?.filePath || "";
}

async function resolveReportSource(configuredPath) {
  const configuredStat = await stat(configuredPath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });

  if (configuredStat?.isDirectory()) {
    const latestFile = await findLatestReportFile(configuredPath);
    if (!latestFile) throw new Error(`No Gatepass workbook matching "report Car in Day *.xlsx" was found in ${configuredPath}`);
    return latestFile;
  }

  const configuredFileName = path.basename(configuredPath);
  if (reportFileNamePattern.test(configuredFileName)) {
    const reportDirectory = path.dirname(configuredPath);
    const latestFile = await findLatestReportFile(reportDirectory).catch((error) => {
      if (error?.code === "ENOENT") return "";
      throw error;
    });
    if (latestFile) return latestFile;
  }

  await access(configuredPath);
  return configuredPath;
}

async function main() {
  await loadEnvFile(path.join(projectDirectory, ".env"));
  await loadEnvFile(path.join(projectDirectory, ".env.gatepass-sync"));

  const configuredSourcePath = process.env.GATEPASS_REPORT_PATH;
  if (!configuredSourcePath) {
    throw new Error("GATEPASS_REPORT_PATH is missing. Copy .env.gatepass-sync.example to .env.gatepass-sync first.");
  }
  const sourcePath = await resolveReportSource(configuredSourcePath);
  if (path.resolve(sourcePath) !== path.resolve(configuredSourcePath)) {
    await log("SELECT latest Gatepass workbook", { source: path.basename(sourcePath) });
  }

  const fileBuffer = await readFile(sourcePath);
  const sourceHash = createHash("sha256").update(fileBuffer).digest("hex");
  const previousState = await readState();
  if (!dryRun && !force && previousState.sourceHash === sourceHash) {
    await log("SKIP unchanged Gatepass workbook", { source: path.basename(sourcePath) });
    return;
  }

  const [{ previewGatepassExcelImport, applyGatepassExcelImport }, { supabase }, { resolveEmailFromIdentifier }] = await Promise.all([
    import("../src/pages/it-dashboard/services/gatepassImportService.js"),
    import("../src/lib/supabaseClient.js"),
    import("../src/lib/authHelpers.js"),
  ]);
  const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
  const fileLike = { name: path.basename(sourcePath), arrayBuffer: async () => arrayBuffer };
  const preview = await previewGatepassExcelImport(fileLike);
  const summary = { ...preview.summary, sheets: preview.sheetCount };

  if (preview.summary.invalid > 0) {
    const samples = preview.rows
      .filter((row) => row.import_errors.length)
      .slice(0, 10)
      .map((row) => ({ sheet: row.source_sheet, row: row.source_row, errors: row.import_errors }));
    await log("BLOCK invalid Gatepass workbook", { summary, samples });
    throw new Error(`Workbook contains ${preview.summary.invalid} invalid rows; no data was imported`);
  }

  if (dryRun) {
    await log("DRY RUN Gatepass workbook is valid", { source: path.basename(sourcePath), summary });
    return;
  }

  const recordHashes = Object.fromEntries(preview.rows.map((row) => {
    const { import_errors, ...record } = row;
    const recordHash = createHash("sha256").update(JSON.stringify(record)).digest("hex");
    return [row.record_key, recordHash];
  }));
  const changedRows = force
    ? preview.rows
    : preview.rows.filter((row) => previousState.recordHashes?.[row.record_key] !== recordHashes[row.record_key]);
  if (!changedRows.length) {
    const checkedAt = new Date().toISOString();
    await writeFile(
      statePath,
      JSON.stringify({ ...previousState, sourcePath, sourceHash, checkedAt, summary, recordHashes }, null, 2),
      "utf8",
    );
    await log("SKIP workbook changed but Gatepass records are unchanged", { source: path.basename(sourcePath), summary });
    return;
  }

  const identifier = process.env.GATEPASS_SYNC_IDENTIFIER || process.env.GATEPASS_SYNC_EMAIL;
  const password = process.env.GATEPASS_SYNC_PASSWORD;
  if (!identifier || !password) {
    throw new Error("GATEPASS_SYNC_IDENTIFIER and GATEPASS_SYNC_PASSWORD are required for automatic import");
  }

  const email = await resolveEmailFromIdentifier(supabase, identifier);
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  try {
    const importPreview = {
      ...preview,
      rows: changedRows,
      summary: { ...preview.summary, total: changedRows.length, ready: changedRows.length, invalid: 0 },
    };
    const result = await applyGatepassExcelImport(importPreview);
    const completedAt = new Date().toISOString();
    await writeFile(
      statePath,
      JSON.stringify({ sourcePath, sourceHash, completedAt, summary, recordHashes, result }, null, 2),
      "utf8",
    );
    await log("SUCCESS Gatepass workbook imported", {
      source: path.basename(sourcePath),
      workbookRows: preview.rows.length,
      changedRows: changedRows.length,
      result,
    });
  } finally {
    await supabase.auth.signOut().catch(() => {});
  }
}

let lockHandle;
try {
  lockHandle = await acquireLock();
  await main();
} catch (error) {
  await log("ERROR Gatepass sync failed", { message: error?.message || String(error) });
  process.exitCode = 1;
} finally {
  await lockHandle?.close().catch(() => {});
  await rm(lockPath, { force: true }).catch(() => {});
}
