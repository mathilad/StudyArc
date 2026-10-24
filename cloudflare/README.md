# StudyArc Cloudflare D1 data API (additive setup)

This directory adds a Cloudflare Worker + D1 backend without editing or replacing any Supabase files. Supabase remains the app's authentication provider. The Worker validates each incoming Supabase access token by calling the existing Supabase Auth user endpoint; it does not need Supabase schema, auth settings, or policies changed.

## Current status

- D1 schema migration: included for the 16 tables in the current `supabase/schema.sql`.
- Worker API: includes health checks and authenticated, table-allowlisted CRUD routes.
- App switch: **not enabled yet**. Existing StudyArc screens still contain Supabase/PostgREST data calls and must be migrated to the Worker API before setting the app's database provider to Cloudflare. Do not change `EXPO_PUBLIC_APP_DATABASE_PROVIDER` to `cloudflare` yet; doing so would break the current `lib/appDatabase.ts` guard.
- This is an additive Cloudflare-only change. No Supabase source files or Supabase database settings are changed.

## 1. Create the D1 database

From the repository root:

```bash
cd cloudflare
npx wrangler d1 create studyarc-db
```

Copy the returned database ID into `cloudflare/wrangler.toml` in place of `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

Apply the schema:

```bash
npx wrangler d1 migrations apply studyarc-db --remote
```

## 2. Configure Worker-side authentication validation

Set the existing Supabase project URL and publishable key as Worker secrets. This only lets the Worker validate existing login tokens; it does not alter Supabase.

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
```

Use the same project URL and publishable key already used by StudyArc. Never add a Supabase service-role/secret key or D1 credential to the Expo app.

## 3. Deploy and verify

```bash
npx wrangler deploy
curl https://YOUR-WORKER.workers.dev/health
```

Expected health response:

```json
{"ok":true,"service":"studyarc-data-api","database":"d1"}
```

Protected table endpoints are under `/v1/<table>` and require `Authorization: Bearer <Supabase access token>`. The Worker returns JSON with `data` and `error` fields for successful database operations.

## 4. Before switching the app

This Worker is the backend foundation, not a completed app-wide data migration. Before routing production data to D1, migrate each existing app data operation to this API and test sign-in, profile, classes, study sessions/laps, syllabus coverage, test marks, past papers, daily reviews, social features, and contact messages. Authentication, password reset, email verification, and Supabase-backed storage remain on Supabase unless separately migrated by explicit request.

## D1 notes

- PostgreSQL arrays are represented as JSON text in D1.
- D1 IDs are TEXT. The API generates UUIDs for rows with an `id` column when the client does not provide one.
- D1 has no Supabase Row Level Security; authorization is enforced in the Worker and must be reviewed before production use.
