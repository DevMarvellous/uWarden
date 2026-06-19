let overlayExists = false;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SHOW_OVERLAY' && !overlayExists) {
    showOverlay(message.roast, message.site_name, message.strictness);
  }
});

function showOverlay(roast, siteName, strictness) {
  overlayExists = true;
  
  // Disable body scroll
  document.body.style.overflow = 'hidden';
  
  const escapePhrase = strictness === 'hard' 
    ? 'i am weak and i give up' 
    : 'let me through';
  
  const overlayHTML = `
    <div id="uw-overlay">
      <div class="uw-container">
        <div class="uw-logo">⚖ UWARDEN</div>
        <p class="uw-roast">${roast}</p>
        <p class="uw-persona">— Disappointed Nigerian Dad</p>
        <div class="uw-escape-wrapper">
          <input
            type="text"
            id="uw-escape-input"
            class="uw-escape-input"
            placeholder="Type to escape..."
            autocomplete="off"
            spellcheck="false"
          />
          <p class="uw-escape-hint">
            To close, type: <span class="uw-escape-phrase">${escapePhrase}</span>
          </p>
        </div>
      </div>
    </div>
  `;
  
  // Inject overlay
  document.body.insertAdjacentHTML('beforeend', overlayHTML);
  
  const overlay = document.getElementById('uw-overlay');
  const escapeInput = document.getElementById('uw-escape-input');
  
  // Focus the input
  setTimeout(() => escapeInput.focus(), 100);
  
  // Handle escape phrase input
  escapeInput.addEventListener('input', (e) => {
    if (e.target.value.toLowerCase() === escapePhrase) {
      // Send override message to background
      chrome.runtime.sendMessage({ 
        type: 'OVERRIDE_USED', 
        url: window.location.href 
      });
      
      // Fade out and remove overlay
      overlay.classList.add('uw-fade-out');
      
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
        overlayExists = false;
      }, 400);
    }
  });
  
  // Prevent escape key from working
  document.addEventListener('keydown', preventEscape);
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