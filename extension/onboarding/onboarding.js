let currentStep = 1;
let userData = {
  session: null,
  userId: null,
  workGoal: '',
  blacklist: [],
  strictness: null
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkExistingSession();
});

function setupEventListeners() {
  // Step 1: Google Sign In
  document.getElementById('google-signin').addEventListener('click', signInWithGoogle);
  
  // Step 2: Work Goal
  const workGoalInput = document.getElementById('work-goal');
  workGoalInput.addEventListener('input', validateWorkGoal);
  document.getElementById('continue-step-2').addEventListener('click', saveWorkGoal);
  
  // Step 3: Blacklist
  const blacklistInput = document.getElementById('blacklist-input');
  blacklistInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBlacklistSite();
  });
  document.getElementById('add-blacklist').addEventListener('click', addBlacklistSite);
  document.getElementById('continue-step-3').addEventListener('click', saveBlacklist);
  
  // Step 4: Strictness
  document.querySelectorAll('.strictness-card').forEach(card => {
    card.addEventListener('click', selectStrictness);
  });
  document.getElementById('activate-warden').addEventListener('click', activateWarden);
}

async function checkExistingSession() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SESSION'
    });
    
    if (response && response.session) {
      userData.session = response.session;
      userData.userId = response.session.user.id;
      goToStep(2);
    }
  } catch (error) {
    console.error('Error checking session:', error);
  }
}

async function signInWithGoogle() {
  try {
    // The background script runs the whole OAuth round trip via
    // chrome.identity and returns the established session directly.
    const response = await chrome.runtime.sendMessage({ type: 'SIGN_IN_GOOGLE' });

    if (response && response.error) {
      throw new Error(response.error);
    }

    if (response && response.session) {
      userData.session = response.session;
      userData.userId = response.session.user.id;
      goToStep(2);
    }
  } catch (error) {
    console.error('Error signing in:', error);
    alert('Sign in failed. Please try again.');
  }
}

function validateWorkGoal() {
  const input = document.getElementById('work-goal');
  const button = document.getElementById('continue-step-2');
  
  if (input.value.trim().length > 0) {
    button.disabled = false;
  } else {
    button.disabled = true;
  }
}

async function saveWorkGoal() {
  const workGoal = document.getElementById('work-goal').value.trim();
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_WORK_GOAL',
      userId: userData.userId,
      workGoal: workGoal
    });
    
    if (response && response.error) {
      throw new Error(response.error);
    }
    
    userData.workGoal = workGoal;
    goToStep(3);
  } catch (error) {
    console.error('Error saving work goal:', error);
    alert('Failed to save work goal. Please try again.');
  }
}

function addBlacklistSite() {
  const input = document.getElementById('blacklist-input');
  const url = input.value.trim().toLowerCase();
  
  if (!url) return;

  const limit = uwBlacklistLimit(false);
  if (userData.blacklist.length >= limit) {
    alert(`The free plan is limited to ${limit} sites.`);
    return;
  }

  if (userData.blacklist.includes(url)) {
    alert('This site is already in your blacklist.');
    return;
  }
  
  userData.blacklist.push(url);
  input.value = '';
  updateBlacklistUI();
}

function removeBlacklistSite(url) {
  userData.blacklist = userData.blacklist.filter(site => site !== url);
  updateBlacklistUI();
}

function updateBlacklistUI() {
  const container = document.getElementById('blacklist-chips');
  const counter = document.getElementById('blacklist-count');
  const continueButton = document.getElementById('continue-step-3');
  
  container.innerHTML = '';
  counter.textContent = userData.blacklist.length;
  
  userData.blacklist.forEach(url => {
    const chip = document.createElement('div');
    chip.className = 'blacklist-chip';
    chip.innerHTML = `
      <span>${url}</span>
      <button class="remove-chip" data-url="${url}">×</button>
    `;
    chip.querySelector('.remove-chip').addEventListener('click', () => removeBlacklistSite(url));
    container.appendChild(chip);
  });
  
  // Enable continue if at least 1 site added
  continueButton.disabled = userData.blacklist.length === 0;
}

async function saveBlacklist() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_BLACKLIST',
      userId: userData.userId,
      blacklist: userData.blacklist
    });
    
    if (response && response.error) {
      throw new Error(response.error);
    }
    
    goToStep(4);
  } catch (error) {
    console.error('Error saving blacklist:', error);
    alert('Failed to save blacklist. Please try again.');
  }
}

function selectStrictness(e) {
  const card = e.currentTarget;
  const strictness = card.dataset.strictness;
  
  // Remove previous selection
  document.querySelectorAll('.strictness-card').forEach(c => {
    c.classList.remove('selected');
  });
  
  // Add selection to clicked card
  card.classList.add('selected');
  userData.strictness = strictness;
  
  // Enable activate button
  document.getElementById('activate-warden').disabled = false;
}

async function activateWarden() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ACTIVATE_WARDEN',
      userId: userData.userId,
      workGoal: userData.workGoal,
      blacklist: userData.blacklist,
      strictness: userData.strictness,
      session: userData.session
    });
    
    if (response && response.error) {
      throw new Error(response.error);
    }
    
    // Close the tab
    chrome.tabs.getCurrent((tab) => {
      chrome.tabs.remove(tab.id);
    });
    
  } catch (error) {
    console.error('Error activating uWarden:', error);
    alert('Failed to activate uWarden. Please try again.');
  }
}

function goToStep(stepNumber) {
  // Hide all steps
  document.querySelectorAll('.step-content').forEach(step => {
    step.classList.add('hidden');
  });
  
  // Show current step
  document.getElementById(`step-${stepNumber}`).classList.remove('hidden');
  
  // Update progress bar
  document.querySelectorAll('.progress-step').forEach((step, index) => {
    if (index < stepNumber) {
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }
  });
  
  currentStep = stepNumber;
}