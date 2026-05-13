/**
 * SHIELD_AI - Content Script
 * Runs on web pages to detect and warn about potential phishing
 */

// Log content script activation
console.log('🛡️ SHIELD_AI content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CHECK_PAGE') {
    analyzeCurrentPage();
    sendResponse({ success: true });
  }
});

/**
 * Analyze the current page URL
 */
async function analyzeCurrentPage() {
  const currentUrl = window.location.href;
  
  // Skip analysis for certain pages
  if (shouldSkipAnalysis(currentUrl)) {
    return;
  }
  
  try {
    // Send URL to background script for analysis
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_URL',
      data: { url: currentUrl }
    });
    
    if (response.success && response.data.is_phishing) {
      showWarning(response.data);
    }
  } catch (error) {
    console.error('SHIELD_AI: Analysis failed', error);
  }
}

/**
 * Check if we should skip analysis for this URL
 */
function shouldSkipAnalysis(url) {
  // Skip local files, chrome pages, and already analyzed pages
  const skipPatterns = [
    '^chrome://',
    '^chrome-extension://',
    '^file://',
    '^about:',
    '^view-source:',
    '^data:',
    '^javascript:'
  ];
  
  return skipPatterns.some(pattern => new RegExp(pattern).test(url));
}

/**
 * Show warning overlay for phishing sites
 */
function showWarning(analysisData) {
  // Check if warning already exists
  if (document.getElementById('shield-ai-warning')) {
    return;
  }
  
  // Create warning overlay
  const overlay = document.createElement('div');
  overlay.id = 'shield-ai-warning';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  const isHighRisk = analysisData.phishing_probability >= 0.7;
  const primaryColor = isHighRisk ? '#dc3545' : '#ffc107';
  const probabilityPercent = (analysisData.phishing_probability * 100).toFixed(1);
  
  overlay.innerHTML = `
    <div style="
      background: #1a1a2e;
      border: 3px solid ${primaryColor};
      border-radius: 16px;
      padding: 40px;
      max-width: 500px;
      text-align: center;
      color: #fff;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    ">
      <div style="font-size: 64px; margin-bottom: 20px;">
        ${isHighRisk ? '🚨' : '⚠️'}
      </div>
      
      <h1 style="
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 10px;
        color: ${primaryColor};
      ">
        ${isHighRisk ? 'PHISHING DETECTED!' : 'SUSPICIOUS WEBSITE'}
      </h1>
      
      <p style="font-size: 16px; margin-bottom: 20px; opacity: 0.9; line-height: 1.5;">
        ${isHighRisk 
          ? 'This website shows strong indicators of being a phishing site. Do NOT enter any personal information.'
          : 'This website shows some suspicious characteristics. Proceed with caution.'}
      </p>
      
      <div style="
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
      ">
        <div style="font-size: 12px; opacity: 0.7; margin-bottom: 5px;">Phishing Probability</div>
        <div style="font-size: 32px; font-weight: 700; color: ${primaryColor};">
          ${probabilityPercent}%
        </div>
        <div style="
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          margin-top: 10px;
        ">
          <div style="
            width: ${probabilityPercent}%;
            height: 100%;
            background: ${primaryColor};
            border-radius: 4px;
          "></div>
        </div>
      </div>
      
      <div style="font-size: 12px; opacity: 0.6; margin-bottom: 20px; word-break: break-all;">
        ${window.location.href}
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="shield-ai-leave" style="
          background: ${primaryColor};
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          flex: 1;
        ">
          Leave Site
        </button>
        
        <button id="shield-ai-proceed" style="
          background: transparent;
          color: #fff;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 14px;
          cursor: pointer;
          flex: 1;
        ">
          Proceed Anyway
        </button>
      </div>
      
      <div style="margin-top: 15px; font-size: 11px; opacity: 0.5;">
        Protected by SHIELD_AI
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Event listeners
  document.getElementById('shield-ai-leave').addEventListener('click', () => {
    window.history.back();
  });
  
  document.getElementById('shield-ai-proceed').addEventListener('click', () => {
    overlay.remove();
  });
}

// Auto-analyze on page load if enabled
(async () => {
  try {
    const settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (settings.success && settings.data.autoAnalyze) {
      // Small delay to avoid interfering with page load
      setTimeout(analyzeCurrentPage, 1000);
    }
  } catch (error) {
    console.error('SHIELD_AI: Could not get settings', error);
  }
})();