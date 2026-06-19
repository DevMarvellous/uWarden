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
  API_BASE_URL: 'http://localhost:3000',

  SUPABASE_URL: 'https://kmjuarnudralmomkbhph.supabase.co',
  SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttanVhcm51ZHJhbG1vbWtiaHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NzQxMTcsImV4cCI6MjA5MzU1MDExN30.IYpbErWf4pM8p-uS-zF4QSwcj6XNDVCG7vWH9mRD_r4',
};

// Make available to service worker (importScripts) and any page that adds this
// file via a <script> tag before its own script.
if (typeof self !== 'undefined') {
  self.UWARDEN_CONFIG = UWARDEN_CONFIG;
}
