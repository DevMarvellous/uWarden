// uWarden extension configuration — single source of truth.
// The extension has no build step, so values live here (not in a .env file).
//
// IMPORTANT: the anon key is safe to ship in a client (it is gated by RLS).
// Never put the Supabase service_role key here.
//
// On deploy, change API_BASE_URL to your Vercel URL, e.g.
//   API_BASE_URL: 'https://your-app.vercel.app'

const UWARDEN_CONFIG = {
  // Where /api/roast is served from. Local dev default:
  API_BASE_URL: 'http://localhost:3001',

  SUPABASE_URL: 'https://kmjuarnudralmomkbhph.supabase.co',
  SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttanVhcm51ZHJhbG1vbWtiaHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NzQxMTcsImV4cCI6MjA5MzU1MDExN30.IYpbErWf4pM8p-uS-zF4QSwcj6XNDVCG7vWH9mRD_r4',

  // === Monetization switch ===
  // Today everyone is premium for free. When you add payments (e.g. Paystack),
  // set this to false and the gates below start enforcing against the user's
  // real `is_pro` flag — no other code needs to change.
  PREMIUM_FOR_ALL: true,

  // What the free tier looks like once PREMIUM_FOR_ALL is false:
  FREE_BLACKLIST_LIMIT: 5,

  // Default roast persona (see PERSONAS in the web /api/roast route).
  DEFAULT_PERSONA: 'nigerian-dad',

  // Persona id -> display name (shown under the roast in the overlay + the
  // popup selector). Keep in sync with web/lib/personas.ts.
  PERSONAS: {
    'nigerian-dad': 'Disappointed Nigerian Dad',
    'gentle-coach': 'Your Focus Coach',
  },

  // Seconds the user must wait before the escape phrase input unlocks
  // (hard/soft modes). This forced pause interrupts the autopilot reach-for-escape.
  ESCAPE_DELAY_SECONDS: 5,

  // Cooldown mode: the site unlocks on its own after this many minutes, once
  // per site per day — no typing, no willpower required. This is the
  // strongest mechanic of the three: it removes the impulsive option instead
  // of relying on the user resisting it.
  COOLDOWN_MINUTES: 10,
};

// Single source of truth for "is this user entitled to premium features".
// Every gate in the extension routes through this.
function uwIsPremium(isPro) {
  return UWARDEN_CONFIG.PREMIUM_FOR_ALL || !!isPro;
}

// How many sites this user may blacklist. Infinity for premium.
function uwBlacklistLimit(isPro) {
  return uwIsPremium(isPro) ? Infinity : UWARDEN_CONFIG.FREE_BLACKLIST_LIMIT;
}

// Consecutive-day streak with no overrides, computed from visit_logs rows
// (each needs `visited_at` and `was_overridden`). A day with zero blocked-site
// attempts is neutral — it neither extends nor breaks the streak. Shared by
// the popup and the dashboard so the number is always consistent.
function uwCalculateStreak(visits) {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayVisits = visits.filter((v) => v.visited_at.startsWith(dateStr));
    const dayOverrides = dayVisits.filter((v) => v.was_overridden);

    if (dayVisits.length > 0 && dayOverrides.length === 0) {
      streak++;
    } else if (dayVisits.length > 0) {
      break;
    }
  }
  return streak;
}

// Make available to the service worker (importScripts) and to any page that
// includes this file via a <script> tag before its own script.
if (typeof self !== 'undefined') {
  self.UWARDEN_CONFIG = UWARDEN_CONFIG;
  self.uwIsPremium = uwIsPremium;
  self.uwBlacklistLimit = uwBlacklistLimit;
  self.uwCalculateStreak = uwCalculateStreak;
}
