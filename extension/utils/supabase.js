// Supabase client for extension (loaded via CDN)
const SUPABASE_URL = 'https://xyz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NFqod9oxb98rS4F_x7SB0Q_InOShkKR';

let supabase = null;

// Wait for Supabase to load from CDN
async function initSupabaseClient() {
  if (supabase) return supabase;
  
  // Wait for window.supabase to be available
  return new Promise((resolve) => {
    const checkSupabase = setInterval(() => {
      if (window.supabase) {
        clearInterval(checkSupabase);
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        resolve(supabase);
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkSupabase);
      console.error('Supabase library failed to load');
      resolve(null);
    }, 5000);
  });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { supabase, initSupabaseClient };
}