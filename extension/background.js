importScripts('config.js', 'supabase-js.js');

const SUPABASE_URL = UWARDEN_CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = UWARDEN_CONFIG.SUPABASE_ANON_KEY;
const API_BASE_URL = UWARDEN_CONFIG.API_BASE_URL;

const supabase = self.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STATIC_ROASTS = [
  "You opened this site again. I am not surprised. I am just tired.",
  "This is the third time today. Close it before I close it for you.",
  "Whatever you are looking for here, it is not your future.",
  "You have work. This is not work. Close the tab.",
  "Every minute here is a minute your mates are moving forward.",
  "I did not buy this laptop for this.",
  "This site will not pay your bills. Your work will. Choose.",
  "You opened this again. We will not discuss it. Just close it.",
  "Your focus is a car with no fuel and you keep adding more holes.",
  "Scrolling will not finish your tasks. Only you can do that.",
  "The distraction found you again. Or did you find it first.",
  "Close this tab. Open your work. That is all I have to say.",
  "Another visit. Another minute wasted. Are you keeping count.",
  "This is not relaxing. This is avoiding. There is a difference.",
  "You know what this site is doing to your productivity. Close it.",
  "Come back when you have finished your work. Until then, no.",
  "Your deadline does not care that you are here. Close the tab.",
  "You opened this site like it has answers. It does not.",
  "Focus. Just that. One thing. Not this.",
  "I have watched you open this tab today. I am choosing not to count."
];

// Load blacklist from Supabase on startup
async function loadBlacklist() {
  try {
    const storage = await chrome.storage.local.get(['session', 'user_id']);
    if (!storage.session || !storage.user_id) return [];

    const { data: blacklists, error } = await supabase
      .from('blacklists')
      .select('url')
      .eq('user_id', storage.user_id);

    if (error) throw error;
    
    const blacklist = blacklists.map(item => item.url);
    await chrome.storage.local.set({ blacklist });
    return blacklist;
  } catch (error) {
    console.error('Error loading blacklist:', error);
    return [];
  }
}

// Log visit to Supabase
async function logVisit(userId, url, siteName, roast) {
  try {
    const { error } = await supabase
      .from('visit_logs')
      .insert({
        user_id: userId,
        url: url,
        site_name: siteName,
        roast: roast || null,
        was_overridden: false
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error logging visit:', error);
  }
}

// Mark visit as overridden
async function markVisitAsOverridden(url) {
  try {
    const storage = await chrome.storage.local.get(['user_id']);
    if (!storage.user_id) return;

    const { error } = await supabase
      .from('visit_logs')
      .update({ was_overridden: true })
      .eq('user_id', storage.user_id)
      .eq('url', url)
      .order('visited_at', { ascending: false })
      .limit(1);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking visit as overridden:', error);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
  }
});

// Handle OAuth redirect
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.url.includes('access_token=')) {
    // Extract tokens from URL
    const url = new URL(details.url);
    const hashParams = new URLSearchParams(url.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    
    if (accessToken) {
      // Set session in Supabase
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ data, error }) => {
        if (!error && data.session) {
          // Store session and redirect to onboarding
          chrome.storage.local.set({
            session: data.session,
            user_id: data.session.user.id
          });
          
          // Close the OAuth tab and open onboarding
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.update(tabs[0].id, { 
                url: chrome.runtime.getURL('onboarding/onboarding.html') 
              });
            }
          });
        }
      });
    }
  }
});

chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const storage = await chrome.storage.local.get([
    'session', 'blacklist', 'user_id', 'work_goal', 'strictness'
  ]);

  if (!storage.session || !storage.blacklist || storage.blacklist.length === 0) return;

  const matchedSite = matchBlacklistedSite(details.url, storage.blacklist);

  if (!matchedSite) return;

  let roast;

  // AI roast for everyone (free for all). Falls back to a static roast on any
  // failure or rate-limit.
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: visits } = await supabase
      .from('visit_logs')
      .select('id')
      .eq('user_id', storage.user_id)
      .gte('visited_at', today)
      .lt('visited_at', today + 'T23:59:59.999Z');

    const visitCount = visits?.length || 0;
    const timeOfDay = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const accessToken = storage.session?.access_token;

    const response = await fetch(`${API_BASE_URL}/api/roast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({
        user_id: storage.user_id,
        url: details.url,
        site_name: matchedSite,
        work_goal: storage.work_goal,
        visit_count_today: visitCount,
        time_of_day: timeOfDay
      })
    });

    if (response.ok) {
      const data = await response.json();
      roast = data.roast;
    }
  } catch (error) {
    console.error('Error getting AI roast:', error);
  }

  // Fallback to static roast if AI fails or is rate-limited
  if (!roast) {
    roast = STATIC_ROASTS[Math.floor(Math.random() * STATIC_ROASTS.length)];
  }

  // Show the overlay
  chrome.tabs.sendMessage(details.tabId, {
    type: 'SHOW_OVERLAY',
    roast,
    site_name: matchedSite,
    strictness: storage.strictness || 'hard'
  });

  // Log the visit (with the roast that was shown)
  if (storage.user_id) {
    await logVisit(storage.user_id, details.url, matchedSite, roast);
  }
});

// Match a URL against the blacklist by hostname, so "x.com" matches
// "https://x.com/home" but not "netflix.com" via a loose substring.
function matchBlacklistedSite(rawUrl, blacklist) {
  let hostname;
  try {
    hostname = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }

  return blacklist.find((entry) => {
    const site = entry
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');
    if (!site) return false;
    return hostname === site || hostname.endsWith('.' + site);
  }) || null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleMessage = async () => {
    if (message.type === 'OVERRIDE_USED') {
      await markVisitAsOverridden(message.url);
    }
    if (message.type === 'GET_SESSION') {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        sendResponse({ session });
      } catch (error) {
        console.error('Error getting session:', error);
        sendResponse({ error: error.message });
      }
    }
    if (message.type === 'SIGN_IN_GOOGLE') {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: message.redirectTo,
            skipBrowserRedirect: true
          }
        });
        if (error) {
          sendResponse({ error: error.message });
        } else {
          sendResponse({ url: data.url });
        }
      } catch (error) {
        console.error('Error signing in:', error);
        sendResponse({ error: error.message });
      }
    }
    if (message.type === 'SAVE_WORK_GOAL') {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const storage = await chrome.storage.local.get(['email']);
        const email = session?.user?.email || storage.email;

        console.log('Upserting user for SAVE_WORK_GOAL:', { id: message.userId, email });

        if (!email) {
          throw new Error('Email is required but was not found in session or storage');
        }

        const { error } = await supabase
          .from('users')
          .upsert({ 
            id: message.userId, 
            work_goal: message.workGoal,
            email: email
          }, { onConflict: 'id' });
        
        if (error) {
          sendResponse({ error: error.message });
        } else {
          await chrome.storage.local.set({ work_goal: message.workGoal, email: email });
          sendResponse({ success: true });
        }
      } catch (error) {
        console.error('Error saving work goal:', error);
        sendResponse({ error: error.message });
      }
    }
    if (message.type === 'SAVE_BLACKLIST') {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const storage = await chrome.storage.local.get(['user_id']);
        const userId = session?.user?.id || message.userId || storage.user_id;

        if (!userId) {
          sendResponse({ error: 'No user ID found' });
          return;
        }

        const { error } = await supabase
          .from('blacklists')
          .upsert(
            message.blacklist.map(url => ({
              user_id: userId,
              url: url
            })),
            { onConflict: 'user_id, url' }
          );
        
        if (error) {
          sendResponse({ error: error.message });
        } else {
          await chrome.storage.local.set({ blacklist: message.blacklist });
          sendResponse({ success: true });
        }
      } catch (error) {
        console.error('Error saving blacklist:', error);
        sendResponse({ error: error.message });
      }
    }
    if (message.type === 'ACTIVATE_WARDEN') {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const storage = await chrome.storage.local.get(['email', 'user_id']);
        
        const email = session?.user?.email || storage.email;
        const userId = session?.user?.id || message.userId || storage.user_id;

        console.log('Upserting user for ACTIVATE_WARDEN:', { userId, email });

        if (!email) {
          sendResponse({ error: 'Email is required to activate uWarden. Please sign in again.' });
          return;
        }

        const { error } = await supabase
          .from('users')
          .upsert({ 
            id: userId,
            email: email,
            strictness: message.strictness,
            onboarding_complete: true,
            work_goal: message.workGoal
          }, { onConflict: 'id' });
        
        if (error) {
          sendResponse({ error: error.message });
        } else {
          await chrome.storage.local.set({
            user_id: userId,
            email: email,
            work_goal: message.workGoal,
            blacklist: message.blacklist,
            strictness: message.strictness,
            onboarding_complete: true
          });
          sendResponse({ success: true });
        }
      } catch (error) {
        console.error('Error activating uWarden:', error);
        sendResponse({ error: error.message });
      }
    }
    if (message.type === 'GET_BLOCKED_COUNT') {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: visits, error } = await supabase
          .from('visit_logs')
          .select('id')
          .eq('user_id', message.userId)
          .gte('visited_at', today)
          .lt('visited_at', today + 'T23:59:59.999Z');
        
        if (error) {
          sendResponse({ count: 0 });
        } else {
          sendResponse({ count: visits?.length || 0 });
        }
      } catch (error) {
        console.error('Error getting blocked count:', error);
        sendResponse({ count: 0 });
      }
    }
    if (message.type === 'ADD_BLACKLIST_ITEM') {
      try {
        const { error } = await supabase
          .from('blacklists')
          .insert({
            user_id: message.userId,
            url: message.url
          });
        
        if (error) {
          sendResponse({ error: error.message });
        } else {
          sendResponse({ success: true });
        }
      } catch (error) {
        console.error('Error adding blacklist item:', error);
        sendResponse({ error: error.message });
      }
    }
    if (message.type === 'REMOVE_BLACKLIST_ITEM') {
      try {
        const { error } = await supabase
          .from('blacklists')
          .delete()
          .eq('user_id', message.userId)
          .eq('url', message.url);
        
        if (error) {
          sendResponse({ error: error.message });
        } else {
          sendResponse({ success: true });
        }
      } catch (error) {
        console.error('Error removing blacklist item:', error);
        sendResponse({ error: error.message });
      }
    }
    if (message.type === 'GET_VISIT_LOGS') {
      try {
        const { data: visits, error } = await supabase
          .from('visit_logs')
          .select('*')
          .eq('user_id', message.userId)
          .order('visited_at', { ascending: false })
          .limit(100);
        
        if (error) {
          sendResponse({ visits: [] });
        } else {
          sendResponse({ visits: visits || [] });
        }
      } catch (error) {
        console.error('Error getting visit logs:', error);
        sendResponse({ visits: [] });
      }
    }
  };

  handleMessage();
  return true; // Keep channel open for async response
});