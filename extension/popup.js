/**
 * SHIELD_AI - Popup Script
 * Handles UI interactions and displays analysis results
 */

// DOM Elements
const currentUrlEl = document.getElementById('currentUrl');
const analyzingState = document.getElementById('analyzingState');
const resultState = document.getElementById('resultState');
const errorState = document.getElementById('errorState');
const analyzeBtn = document.getElementById('analyzeBtn');
const settingsBtn = document.getElementById('settingsBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// Result elements
const resultIcon = document.getElementById('resultIcon');
const resultTitle = document.getElementById('resultTitle');
const resultDetails = document.getElementById('resultDetails');
const confidenceFill = document.getElementById('confidenceFill');
const confidenceText = document.getElementById('confidenceText');
const featureList = document.getElementById('featureList');
const errorMessage = document.getElementById('errorMessage');

let currentTabUrl = '';

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🛡️ SHIELD_AI popup initialized');
  
  // Get current tab URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabUrl = tab.url;
    currentUrlEl.textContent = currentTabUrl;
    
    // Check API status
    checkApiStatus();
    
    // Auto-analyze if enabled
    const settings = await getSettings();
    if (settings.autoAnalyze) {
      analyzeUrl();
    }
  } catch (error) {
    console.error('Error getting current tab:', error);
    currentUrlEl.textContent = 'Unable to get current URL';
    showError('Cannot access this page');
  }
  
  // Event listeners
  analyzeBtn.addEventListener('click', analyzeUrl);
  settingsBtn.addEventListener('click', openSettings);
});

/**
 * Get settings from storage
 */
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['autoAnalyze', 'showNotifications', 'cacheEnabled'], resolve);
  });
}

/**
 * Check API status
 */
async function checkApiStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_API_STATUS' });
    
    if (response.success) {
      const status = response.data;
      if (status.status === 'online') {
        statusDot.className = 'status-dot online';
        statusText.textContent = `API Online - ${status.service} ${status.version}`;
      } else {
        statusDot.className = 'status-dot offline';
        statusText.textContent = `API ${status.status}: ${status.message}`;
      }
    } else {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'API Error';
    }
  } catch (error) {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'API Offline';
  }
}

/**
 * Analyze current URL
 */
async function analyzeUrl() {
  if (!currentTabUrl) {
    showError('No URL to analyze');
    return;
  }
  
  // Show analyzing state
  showAnalyzing();
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_URL',
      data: { url: currentTabUrl }
    });
    
    if (response.success) {
      showResult(response.data);
    } else {
      showError(response.error || 'Analysis failed');
    }
  } catch (error) {
    console.error('Analysis error:', error);
    showError('Failed to connect to API. Make sure the backend server is running.');
  }
}

/**
 * Show analyzing state
 */
function showAnalyzing() {
  hideAllStates();
  analyzingState.classList.remove('hidden');
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = '⏳ Analyzing...';
}

/**
 * Show result state
 */
function showResult(data) {
  hideAllStates();
  resultState.classList.remove('hidden');
  resultState.className = 'result-box';
  
  // Determine risk level styling
  if (data.is_phishing) {
    if (data.phishing_probability >= 0.7) {
      resultState.classList.add('danger');
      resultIcon.textContent = '🚨';
      resultTitle.textContent = 'PHISHING DETECTED!';
      resultTitle.style.color = '#ff6b6b';
    } else {
      resultState.classList.add('warning');
      resultIcon.textContent = '⚠️';
      resultTitle.textContent = 'SUSPICIOUS';
      resultTitle.style.color = '#ffe066';
    }
  } else {
    resultState.classList.add('safe');
    resultIcon.textContent = '✅';
    resultTitle.textContent = 'SAFE';
    resultTitle.style.color = '#69db7c';
  }
  
  // Set details
  resultDetails.textContent = `Risk Level: ${data.risk_level.toUpperCase()}`;
  
  // Confidence bar
  const confidencePercent = (data.confidence * 100).toFixed(1);
  const phishingPercent = (data.phishing_probability * 100).toFixed(1);
  
  if (data.is_phishing) {
    confidenceFill.style.background = '#dc3545';
    confidenceFill.style.width = `${phishingPercent}%`;
    confidenceText.textContent = `Phishing Probability: ${phishingPercent}%`;
  } else {
    confidenceFill.style.background = '#28a745';
    confidenceFill.style.width = `${confidencePercent}%`;
    confidenceText.textContent = `Safety Confidence: ${confidencePercent}%`;
  }
  
  // Feature list
  if (data.features) {
    featureList.innerHTML = `
      <div><strong>URL Analysis:</strong></div>
      <div>• Length: ${data.features.url_length} chars</div>
      <div>• Dots: ${data.features.n_dots} | Hyphens: ${data.features.n_hyphen}</div>
      <div>• Slashes: ${data.features.n_slash} | Queries: ${data.features.n_queries}</div>
      <div>• Special chars (@, !, &): ${data.features.n_at + data.features.n_exclamation + data.features.n_and}</div>
      ${data.cached ? '<div style="color: #ffc107; margin-top: 5px;">• Result from cache</div>' : ''}
    `;
    featureList.style.display = 'block';
  }
  
  analyzeBtn.disabled = false;
  analyzeBtn.textContent = '🔄 Re-analyze';
}

/**
 * Show error state
 */
function showError(message) {
  hideAllStates();
  errorState.classList.remove('hidden');
  errorMessage.textContent = message;
  
  analyzeBtn.disabled = false;
  analyzeBtn.textContent = '🔍 Try Again';
}

/**
 * Hide all state boxes
 */
function hideAllStates() {
  analyzingState.classList.add('hidden');
  resultState.classList.add('hidden');
  errorState.classList.add('hidden');
}

/**
 * Open settings (placeholder)
 */
function openSettings() {
  // For now, just show an alert
  // In a full implementation, this would open a settings page
  alert('Settings page coming soon!\n\nYou can configure:\n• API Endpoint URL\n• Auto-analyze on page load\n• Notification preferences\n• Cache settings');
}