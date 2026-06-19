let currentState = 'logged-out';
let userData = {
  session: null,
  userId: null,
  email: '',
  blacklist: [],
  workGoal: '',
  strictness: 'hard',
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
      'session', 'user_id', 'email', 'blacklist',
      'work_goal', 'strictness', 'onboarding_complete'
    ]);

    userData = {
      session: storage.session || null,
      userId: storage.user_id || null,
      email: storage.email || '',
      blacklist: storage.blacklist || [],
      workGoal: storage.work_goal || '',
      strictness: storage.strictness || 'hard',
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
    updateBlockedCount();
  }
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

async function updateBlockedCount() {
  try {
    if (!userData.userId) return;

    const response = await chrome.runtime.sendMessage({
      type: 'GET_BLOCKED_COUNT',
      userId: userData.userId
    });

    document.getElementById('blocked-count').textContent =
      response && !response.error ? response.count || 0 : '0';
  } catch (error) {
    console.error('Error getting blocked count:', error);
    document.getElementById('blocked-count').textContent = '0';
  }
}

function setupEventListeners() {
  // Logged-out: Get Started
  document.getElementById('get-started').addEventListener('click', async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SIGN_IN_GOOGLE',
        redirectTo: chrome.runtime.getURL('onboarding/onboarding.html')
      });

      if (response && response.error) {
        alert('Sign in failed: ' + response.error);
      } else if (response && response.url) {
        chrome.tabs.create({ url: response.url });
      }
    } catch (error) {
      console.error('Error signing in:', error);
      alert('Sign in failed: ' + error.message);
    }
  });

  // Active: blacklist + dashboard
  document.getElementById('add-site').addEventListener('click', addBlacklistItem);
  document.getElementById('blacklist-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBlacklistItem();
  });
  document.getElementById('view-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  });
}

async function addBlacklistItem() {
  const inputElement = document.getElementById('blacklist-input');
  const url = inputElement.value.trim().toLowerCase();

  if (!url) return;

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
