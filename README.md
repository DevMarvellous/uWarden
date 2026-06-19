# uWarden

The AI accountability extension that roasts your distractions.

uWarden is a Chrome extension that intercepts the sites you've personally
blacklisted and takes over the tab with a full-screen, AI-generated roast.
The only way out is typing an escape phrase — friction that's psychologically
costly enough that most people just close the tab and get back to work.

## Structure

- **`extension/`** — Chrome Extension (Manifest V3, vanilla JS). Site
  detection, the overlay, onboarding, popup, and the shame dashboard.
- **`web/`** — Next.js app hosting the `/api/roast` endpoint (Google Gemini).
- **`database_schema.sql`** — Supabase Postgres schema (users, blacklists,
  visit_logs) with Row Level Security.

## Tech

- Chrome Extension MV3 · Supabase (Auth + Postgres + RLS) · Next.js (API) ·
  Google Gemini 2.0 Flash

## Local setup

1. **Database** — run `database_schema.sql` in the Supabase SQL editor.
2. **Web** — `cd web && npm install && npm run dev`. Create `web/.env.local`
   with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY`.
3. **Extension** — set `API_BASE_URL` in `extension/config.js`, then load
   `extension/` as an unpacked extension at `chrome://extensions`.

> `web/.env.local` is gitignored and must never be committed.

uWarden is free for everyone.
