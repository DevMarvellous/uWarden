let overlayExists = false;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SHOW_OVERLAY' && !overlayExists) {
    showOverlay(message);
  }
});

function showOverlay(data) {
  const {
    roast,
    site_name: siteName,
    strictness,
    work_goal: workGoal,
    visit_count: visitCount,
    persona_name: personaName,
    escape_delay: escapeDelay,
    cooldown_remaining_ms: cooldownRemainingMs
  } = data;

  overlayExists = true;

  // Disable body scroll
  document.body.style.overflow = 'hidden';

  const isCooldown = strictness === 'cooldown';

  // Hard mode is framed as a choice ("I am choosing X"), not an identity attack
  // ("I am weak") — typing it is still costly/embarrassing (that's the friction),
  // but it names the behavior instead of condemning the person.
  const escapePhrase =
    strictness === 'hard' ? 'i am choosing distraction over my goal' : 'let me through';
  const delaySeconds = Number.isFinite(escapeDelay) ? escapeDelay : 5;

  const overlayHTML = `
    <div id="uw-overlay">
      <div class="uw-container">
        <div class="uw-logo">⚖ UWARDEN</div>

        <div class="uw-meta">
          <span class="uw-site"></span>
          <span class="uw-visit"></span>
        </div>

        <p class="uw-roast"></p>
        <p class="uw-persona"></p>

        <div class="uw-goal" hidden>
          <span class="uw-goal-label">You told me you were working on</span>
          <span class="uw-goal-text"></span>
        </div>

        <div class="uw-cooldown-panel" hidden>
          <div class="uw-cooldown-timer"></div>
          <p class="uw-cooldown-hint">This unlocks on its own. No typing, no caving — just wait it out.</p>
        </div>

        <div class="uw-escape-wrapper" hidden>
          <div class="uw-countdown">
            <span class="uw-countdown-num"></span> seconds before you can give up...
          </div>
          <div class="uw-escape-area" hidden>
            <input
              type="text"
              id="uw-escape-input"
              class="uw-escape-input"
              placeholder="Type the phrase to escape..."
              autocomplete="off"
              spellcheck="false"
            />
            <p class="uw-escape-hint">
              To close, type: <span class="uw-escape-phrase"></span>
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', overlayHTML);

  const overlay = document.getElementById('uw-overlay');

  // Fill dynamic text via textContent so a roast can never inject markup.
  overlay.querySelector('.uw-site').textContent = siteName ? `You opened ${siteName}` : '';
  overlay.querySelector('.uw-visit').textContent =
    visitCount && visitCount > 1 ? `· visit #${visitCount} today` : '';
  overlay.querySelector('.uw-roast').textContent = roast;
  overlay.querySelector('.uw-persona').textContent = `— ${personaName || 'Disappointed Nigerian Dad'}`;

  if (workGoal) {
    overlay.querySelector('.uw-goal-text').textContent = workGoal;
    overlay.querySelector('.uw-goal').hidden = false;
  }

  if (isCooldown) {
    setupCooldownPanel(overlay, cooldownRemainingMs);
  } else {
    overlay.querySelector('.uw-escape-phrase').textContent = escapePhrase;
    overlay.querySelector('.uw-escape-wrapper').hidden = false;
    setupEscapePanel(overlay, escapePhrase, delaySeconds);
  }

  // Prevent escape key from working
  document.addEventListener('keydown', preventEscape);
}

// Cooldown mode: pure timer, no input. Auto-dismisses when time is up — this
// is not an "override" (was_overridden stays false), since caving was never
// an available action here.
function setupCooldownPanel(overlay, remainingMs) {
  const panel = overlay.querySelector('.uw-cooldown-panel');
  const timerEl = overlay.querySelector('.uw-cooldown-timer');
  panel.hidden = false;

  let remaining = Math.max(0, Math.round(remainingMs / 1000));

  const render = () => {
    const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
    const secs = (remaining % 60).toString().padStart(2, '0');
    timerEl.textContent = `${mins}:${secs}`;
  };
  render();

  const tick = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(tick);
      closeOverlay(overlay);
    } else {
      render();
    }
  }, 1000);
}

// Hard/soft modes: forced pause, then a typed escape phrase.
function setupEscapePanel(overlay, escapePhrase, delaySeconds) {
  const escapeInput = overlay.querySelector('#uw-escape-input');
  const countdownEl = overlay.querySelector('.uw-countdown');
  const countdownNum = overlay.querySelector('.uw-countdown-num');
  const escapeArea = overlay.querySelector('.uw-escape-area');

  let remaining = delaySeconds;
  countdownNum.textContent = remaining;

  const tick = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(tick);
      countdownEl.hidden = true;
      escapeArea.hidden = false;
      escapeInput.focus();
    } else {
      countdownNum.textContent = remaining;
    }
  }, 1000);

  escapeInput.addEventListener('input', (e) => {
    if (e.target.value.toLowerCase() === escapePhrase) {
      chrome.runtime.sendMessage({
        type: 'OVERRIDE_USED',
        url: window.location.href
      });
      closeOverlay(overlay);
    }
  });
}

function closeOverlay(overlay) {
  overlay.classList.add('uw-fade-out');
  setTimeout(() => {
    overlay.remove();
    document.body.style.overflow = '';
    overlayExists = false;
    document.removeEventListener('keydown', preventEscape);
  }, 400);
}

function preventEscape(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
  }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  document.removeEventListener('keydown', preventEscape);
});
