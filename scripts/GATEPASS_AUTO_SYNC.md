# Gatepass automatic Excel sync

The browser cannot continuously read an arbitrary `H:\` file. This local agent reads the workbook on Windows and imports it through the same validation and Supabase RPC used by the Gatepass management page.

## One-time setup

1. Create a dedicated Supabase Auth user for the sync agent.
2. Ensure its `profiles` row is active and has role `security`, `it_support`, or `admin`.
3. Copy `.env.gatepass-sync.example` to `.env.gatepass-sync` and set the employee code (or email), password, and report folder. The legacy `GATEPASS_SYNC_EMAIL` key is also accepted. The sync automatically selects the newest modified `report Car in Day *.xlsx` file, so daily filename changes do not require configuration updates.
4. Validate the current workbook without uploading:

   `npm.cmd run gatepass:sync:dry-run`

5. Run one real import and confirm it appears in the Gatepass Import history:

   `npm.cmd run gatepass:sync`

6. Install the Windows Scheduled Task:

   `npm.cmd run gatepass:task:install`

The task checks the file once every day at 07:45 while the Windows user is logged in, five minutes after the normal 07:40 report update. It first checks the workbook SHA-256 hash, then imports only new or modified Gatepass rows from a changed cumulative workbook. Unchanged history is not written again. The log is written to `logs/gatepass-sync.log`.

## Operational notes

- Keep the task in interactive mode when `H:` is a mapped drive. Scheduled tasks running under a non-interactive account often cannot see mapped drive letters. A UNC path such as `\\server\share\...` is more reliable if one is available.
- The workbook is validated before upload. If any source row is invalid, the whole automatic import is blocked and the error is recorded in the log.
- The database RPC upserts records. Existing Gatepass numbers are updated instead of inserted again.
- Use `node scripts/sync-gatepass-report.mjs --force` only when the same unchanged file must be re-imported intentionally.
