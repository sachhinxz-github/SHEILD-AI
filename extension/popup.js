const currentUrlEl = document.getElementById('currentUrl');
const analyzingState = document.getElementById('analyzingState');
const resultState = document.getElementById('resultState');
const errorState = document.getElementById('errorState');
const analyzeBtn = document.getElementById('analyzeBtn');
const settingsBtn = document.getElementById('settingsBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

const resultIcon = document.getElementById('resultIcon');
const resultTitle = document.getElementById('resultTitle');
const resultDetails = document.getElementById('resultDetails');
const confidenceFill = document.getElementById('confidenceFill');
const confidenceText = document.getElementById('confidenceText');
const featureList = document.getElementById('featureList');
const errorMessage = document.getElementById('errorMessage');

let currentTabUrl = '';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabUrl = tab.url;
    currentUrlEl.textContent = currentTabUrl;
    
    checkApiStatus();
    
    const settings = await getSettings();
    if (settings.autoAnalyze) {
      analyzeUrl();
    }
  } catch (error) {
    currentUrlEl.textContent = 'Unable to get current URL';
    showError('Cannot access this page');
  }
  
  analyzeBtn.addEventListener('click', analyzeUrl);
  settingsBtn.addEventListener('click', openSettings);
});

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['autoAnalyze', 'showNotifications', 'cacheEnabled'], resolve);
  });
}

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

async function analyzeUrl() {
  if (!currentTabUrl) {
    showError('No URL to analyze');
    return;
  }
  
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
    showError('Failed to connect to API. Make sure the backend server is running.');
  }
}

function showAnalyzing() {
  hideAllStates();
  analyzingState.classList.remove('hidden');
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = 'Analyzing...';
}

function showResult(data) {
  hideAllStates();
  resultState.classList.remove('hidden');
  resultState.className = 'result-box';
  
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
  
  resultDetails.textContent = `Risk Level: ${data.risk_level.toUpperCase()}`;
  
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
  
  if (data.features) {
    featureList.innerHTML = `
      <div><strong>URL Analysis:</strong></div>
      <div>• Length: ${data.features.url_length} chars</div>
      <div>• Dots: ${data.features.n_dots} | Hyphens: ${data.features.n_hypens}</div>
      <div>• Slashes: ${data.features.n_slash} | Queries: ${data.features.n_questionmark}</div>
      <div>• Special chars (@, !, &): ${data.features.n_at + data.features.n_exclamation + data.features.n_and}</div>
      ${data.cached ? '<div style="color: #ffc107; margin-top: 5px;">• Result from cache</div>' : ''}
    `;
    featureList.style.display = 'block';
  }
  
  analyzeBtn.disabled = false;
  analyzeBtn.textContent = 'Re-analyze';
}

function showError(message) {
  hideAllStates();
  errorState.classList.remove('hidden');
  errorMessage.textContent = message;
  
  analyzeBtn.disabled = false;
  analyzeBtn.textContent = 'Try Again';
}

function hideAllStates() {
  analyzingState.classList.add('hidden');
  resultState.classList.add('hidden');
  errorState.classList.add('hidden');
}

function openSettings() {
  alert('Settings page coming soon!\n\nYou can configure:\n• API Endpoint URL\n• Auto-analyze on page load\n• Notification preferences\n• Cache settings');
}