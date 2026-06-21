let currentState = 'logged-out';
let userData = {
  session: null,
  userId: null,
  email: '',
  isPro: false,
  blacklist: [],
  workGoal: '',
  strictness: 'hard',
  persona: 'nigerian-dad',
  onboardingComplete: false
};

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  loadUserData();
  setupEventListeners();
});

async function loadUserData() {
  try {
    const storage = await chrome.storage.local.get([
      'session', 'user_id', 'email', 'is_pro', 'blacklist',
      'work_goal', 'strictness', 'persona', 'onboarding_complete'
    ]);

    userData = {
      session: storage.session || null,
      userId: storage.user_id || null,
      email: storage.email || '',
      isPro: storage.is_pro || false,
      blacklist: storage.blacklist || [],
      workGoal: storage.work_goal || '',
      strictness: storage.strictness || 'hard',
      persona: storage.persona || 'nigerian-dad',
      onboardingComplete: storage.onboarding_complete || false
    };

    determineState();
    updateUI();
  } catch (error) {
    console.error('Error loading user data:', error);
    determineState();
    updateUI();
  }
}

function determineState() {
  currentState =
    !userData.session || !userData.onboardingComplete ? 'logged-out' : 'active';
}

function updateUI() {
  // Hide all states
  document.querySelectorAll('.state-content').forEach(state => {
    state.classList.add('hidden');
  });

  // Show current state
  document.getElementById(`state-${currentState}`).classList.remove('hidden');

  if (currentState === 'active') {
    document.getElementById('user-email').textContent = userData.email;
    updateBlacklistUI();
    updateTodayStats();
    updateStreakBanner();
    updatePersonaUI();
    updateStrictnessUI();
    updateWorkGoalUI();
  }
}

function updatePersonaUI() {
  document.querySelectorAll('.persona-option').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.persona === userData.persona);
  });
}

async function selectPersona(persona) {
  userData.persona = persona;
  await chrome.storage.local.set({ persona });
  updatePersonaUI();
}

function updateStrictnessUI() {
  document.querySelectorAll('.mode-option').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.strictness === userData.strictness);
  });
}

async function selectStrictness(strictness) {
  userData.strictness = strictness;
  // Save locally first so blocking uses the new mode immediately, even if the
  // DB write below fails or the user is offline.
  await chrome.storage.local.set({ strictness });
  updateStrictnessUI();

  // Best-effort persistence to the user's profile.
  if (userData.userId) {
    chrome.runtime.sendMessage({
      type: 'SAVE_STRICTNESS',
      userId: userData.userId,
      strictness
    });
  }
}

function updateWorkGoalUI() {
  document.getElementById('work-goal-input').value = userData.workGoal || '';
}

async function saveWorkGoal() {
  const input = document.getElementById('work-goal-input');
  const workGoal = input.value.trim();

  userData.workGoal = workGoal;
  await chrome.storage.local.set({ work_goal: workGoal });

  if (userData.userId) {
    chrome.runtime.sendMessage({
      type: 'SAVE_WORK_GOAL',
      userId: userData.userId,
      workGoal
    });
  }

  const saved = document.getElementById('goal-saved');
  saved.classList.remove('hidden');
  setTimeout(() => saved.classList.add('hidden'), 1500);
}

function updateBlacklistUI() {
  const listElement = document.getElementById('blacklist-list');
  listElement.innerHTML = '';

  userData.blacklist.forEach(url => {
    const item = document.createElement('div');
    item.className = 'blacklist-item';

    const span = document.createElement('span');
    span.className = 'blacklist-url';
    span.textContent = url;

    const btn = document.createElement('button');
    btn.className = 'remove-btn';
    btn.textContent = '×';
    btn.addEventListener('click', () => removeBlacklistItem(url));

    item.appendChild(span);
    item.appendChild(btn);
    listElement.appendChild(item);
  });
}

// Surfaces "resisted" as the primary, positive stat — not just failures.
// The data (total vs. caved) already existed; it was just never shown.
async function updateTodayStats() {
  try {
    if (!userData.userId) return;

    const response = await chrome.runtime.sendMessage({
      type: 'GET_TODAY_STATS',
      userId: userData.userId
    });

    const stats = response && !response.error ? response : { total: 0, caved: 0, resisted: 0 };
    document.getElementById('resisted-count').textContent = stats.resisted || 0;
    document.getElementById('blocked-count').textContent = stats.total || 0;
    document.getElementById('caved-count').textContent = stats.caved || 0;
  } catch (error) {
    console.error('Error getting today stats:', error);
  }
}

// Quiet re-engagement after a broken streak, instead of just resetting the
// counter silently. Counters the "I already failed, screw it" spiral
// (the abstinence violation effect) that kills momentum after one slip.
async function updateStreakBanner() {
  const banner = document.getElementById('streak-banner');
  try {
    if (!userData.userId) return;

    const response = await chrome.runtime.sendMessage({
      type: 'GET_VISIT_LOGS',
      userId: userData.userId
    });

    const visits = response && !response.error ? response.visits || [] : [];
    const streak = uwCalculateStreak(visits);

    const { best_streak: storedBest = 0 } = await chrome.storage.local.get(['best_streak']);
    if (streak > storedBest) {
      await chrome.storage.local.set({ best_streak: streak });
    }

    banner.classList.remove('hidden', 'streak-banner-up', 'streak-banner-reset');

    if (streak === 0 && storedBest >= 2) {
      banner.classList.add('streak-banner-reset');
      banner.textContent = `Your ${storedBest}-day streak reset. That's normal — every focused day starts right now.`;
    } else if (streak >= 1) {
      banner.classList.add('streak-banner-up');
      banner.textContent = `${streak} day${streak === 1 ? '' : 's'} focused. Keep going.`;
    } else {
      banner.classList.add('hidden');
    }
  } catch (error) {
    console.error('Error computing streak:', error);
    banner.classList.add('hidden');
  }
}

function setupEventListeners() {
  // Logged-out: Get Started → open the onboarding page, which runs the full
  // Google sign-in flow via chrome.identity.
  document.getElementById('get-started').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
  });

  // Active: blacklist + dashboard
  document.getElementById('add-site').addEventListener('click', addBlacklistItem);
  document.getElementById('blacklist-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBlacklistItem();
  });
  document.getElementById('view-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  });

  // Persona selector
  document.querySelectorAll('.persona-option').forEach((btn) => {
    btn.addEventListener('click', () => selectPersona(btn.dataset.persona));
  });

  // Strictness mode selector
  document.querySelectorAll('.mode-option').forEach((btn) => {
    btn.addEventListener('click', () => selectStrictness(btn.dataset.strictness));
  });

  // Work goal
  document.getElementById('save-goal').addEventListener('click', saveWorkGoal);
  document.getElementById('work-goal-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveWorkGoal();
  });
}

async function addBlacklistItem() {
  const inputElement = document.getElementById('blacklist-input');
  const url = inputElement.value.trim().toLowerCase();

  if (!url) return;

  const limit = uwBlacklistLimit(userData.isPro);
  if (userData.blacklist.length >= limit) {
    alert(`The free plan is limited to ${limit} sites.`);
    return;
  }

  if (userData.blacklist.includes(url)) {
    alert('This site is already in your blacklist.');
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ADD_BLACKLIST_ITEM',
      userId: userData.userId,
      url: url
    });

    if (response && response.error) {
      throw new Error(response.error);
    }

    userData.blacklist.push(url);
    await chrome.storage.local.set({ blacklist: userData.blacklist });

    inputElement.value = '';
    updateBlacklistUI();
  } catch (error) {
    console.error('Error adding blacklist item:', error);
    alert('Failed to add site. Please try again.');
  }
}

async function removeBlacklistItem(url) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'REMOVE_BLACKLIST_ITEM',
      userId: userData.userId,
      url: url
    });

    if (response && response.error) {
      throw new Error(response.error);
    }

    userData.blacklist = userData.blacklist.filter(site => site !== url);
    await chrome.storage.local.set({ blacklist: userData.blacklist });

    updateBlacklistUI();
  } catch (error) {
    console.error('Error removing blacklist item:', error);
    alert('Failed to remove site. Please try again.');
  }
}
