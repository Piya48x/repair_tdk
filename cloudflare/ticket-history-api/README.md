# Ticket History API

Cloudflare Worker for private ticket attachments and archived ticket JSON in the
`ticket-history` R2 bucket.

## Cloudflare configuration

Bind the R2 bucket with this exact binding name:

```text
TICKET_HISTORY -> ticket-history
```

Add these Worker runtime variables/secrets:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
ALLOWED_ORIGINS=http://localhost:5173,https://YOUR_PRODUCTION_DOMAIN
FILE_SIGNING_SECRET=A_LONG_RANDOM_SECRET
```

`FILE_SIGNING_SECRET` must be added as an encrypted secret. Do not prefix any of
these values with `VITE_` in Cloudflare.

## Dashboard deployment

Open the Worker code editor, replace the Hello World script with `worker.js`,
and select **Deploy**. Then open `/health`; a correctly configured deployment
returns:

```json
{"ok":true,"service":"ticket-history-api"}
```

## Endpoints

- `GET /health` verifies configuration.
- `POST /upload` accepts `multipart/form-data` fields `file`, `ticketId`, and
  `kind` (`before`, `after`, `chat`, or `general`).
- `POST /archive` accepts `{ "ticketId": "...", "record": { ... } }`.
- `POST /sign` accepts `{ "objectKey": "..." }` and returns a short-lived URL.
- `POST /it-work/upload` stores evidence for General IT Work records.
- `DELETE /it-work/files` removes General IT Work evidence by R2 object key.
- `POST /managed/upload` stores files for the approved `stock-files`,
  `it-assets`, `asset-audits`, and `asset-moves` scopes.
- `DELETE /managed/files` removes files from those managed scopes by R2 object
  key.
- `GET /file?...` serves an object only through a valid short-lived signature.
- `GET /asset?...` serves a stable, signed capability URL used by the current UI.

Set this variable in the Vite/Vercel application (not in the Worker):

```text
VITE_TICKET_HISTORY_API_URL=https://ticket-history-api.YOUR_SUBDOMAIN.workers.dev
```

All write/sign endpoints require `Authorization: Bearer <Supabase access token>`.
