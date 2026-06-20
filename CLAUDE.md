# uWarden

Chrome extension that blocks chosen sites with a full-screen, AI-generated roast
overlay. Free for everyone right now — no payments, no tiers — but the
architecture is built so a payment system can be added later without a rewrite.

## Architecture (3 parts)

- **`extension/`** — Chrome Extension, Manifest V3, vanilla JS, no build step.
  Scripts are loaded via plain `<script>` tags in HTML, in order. Site
  detection + roast fetching happens in `background.js` (the service worker);
  the overlay lives in `content.js`/`content.css`.
- **`web/`** — Next.js 16 / React 19. Hosts exactly one thing the extension
  needs from a server: `POST /api/roast` (calls Gemini). See `web/AGENTS.md`
  for Next-16-specific warnings — it's newer than most training data.
- **`database_schema.sql`** — Supabase Postgres. Run manually in the Supabase
  SQL editor; there's no migration CLI wired up. It's idempotent (`IF NOT
  EXISTS` / `DROP ... IF EXISTS`) so re-running it on an existing DB is safe.

## Single sources of truth — edit these, not call sites

- **`extension/config.js`** — `API_BASE_URL`, Supabase creds, the
  `PREMIUM_FOR_ALL` monetization switch, persona display names, cooldown/escape
  timing, and shared helpers (`uwIsPremium`, `uwBlacklistLimit`,
  `uwCalculateStreak`). Every extension page loads this before its own script.
- **`web/lib/personas.ts`** — roast prompts + static fallbacks per persona.
  Keep persona `id`s in sync with `extension/config.js`'s `PERSONAS` map.

## Monetization (currently off)

Everyone is premium for free: `PREMIUM_FOR_ALL = true` in `extension/config.js`,
mirrored by the `PREMIUM_FOR_ALL` env var (default `true`) in
`web/app/api/roast/route.ts`. The `is_pro` DB column already exists and is
dormant. To turn payments back on: flip both flags to `false` — the gates
(blacklist limit, AI-vs-static roast) are already wired and will start
enforcing against the real `is_pro` value. No other code should need to change.

## Strictness modes

- **`cooldown`** (default/recommended) — site auto-unlocks after
  `COOLDOWN_MINUTES`, no typing. State persists per-hostname-per-day in
  `chrome.storage.local.cooldowns`, so closing/reopening the tab can't reset
  the timer.
- **`hard`** — typed escape phrase, currently `"i am choosing distraction over
  my goal"` (deliberately choice-language, not identity-shame language).
- **`soft`** — typed escape phrase `"let me through"`.

The DB's `strictness` CHECK constraint must allow exactly `('hard', 'soft',
'cooldown')` — it originally allowed unrelated values and silently broke
`soft` mode; the migration in `database_schema.sql` fixes this.

## Conventions to keep

- Never inject roast/user text via `innerHTML` — always `textContent`.
- Blacklist matching is by hostname (`matchBlacklistedSite` in
  `background.js`), not substring — `x.com` must not match `netflix.com`.
- `visit_logs.roast` stores whatever text was actually shown (AI or static),
  for the dashboard.
- Streak math lives in one place (`uwCalculateStreak` in `config.js`) — don't
  reimplement it inline in the popup or dashboard.

## Local dev

- **Web**: `cd web && npm install && npm run dev` → `localhost:3000`.
- **Extension**: `chrome://extensions` → enable Developer Mode → Load
  unpacked → select `extension/`. Set `API_BASE_URL` in `extension/config.js`
  to wherever the web app is running.
- **DB**: paste `database_schema.sql` into the Supabase SQL editor.

## Known gaps (not yet built)

- No automated tests.
- Extension icons (`extension/icons/icon{16,48,128}.png`) are placeholder/empty.
- No privacy policy page yet (required for Chrome Web Store submission).

## Other docs in this repo

- **`TASKS.md`** (root) — action items for the human only (Supabase setup,
  deploying, icons, launch path). Not a list of things Claude should do
  unprompted; update it when work here changes what's left.
- **`web/CLAUDE.md`** — just imports `web/AGENTS.md` (the auto-generated
  create-next-app warning about Next 16 breaking changes vs. training data).
  Coexists fine with this root file — nested CLAUDE.md files load alongside
  the root one, no conflict.

## How to work on this repo

- If a requirement isn't stated or you're not sure which way to go (a naming
  choice, a UX tradeoff, which file something belongs in), ask rather than
  guessing.
- Keep this file current as the architecture or decisions change, so context
  surviving a chat reset stays accurate.
