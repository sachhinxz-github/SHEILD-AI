const DEFAULT_API_URL = 'http://localhost:5000';
const API_TIMEOUT = 10000;

const analysisCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    apiUrl: DEFAULT_API_URL,
    autoAnalyze: true,
    showNotifications: true,
    cacheEnabled: true
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'ANALYZE_URL':
      analyzeUrl(request.data.url)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    
    case 'GET_API_STATUS':
      checkApiStatus()
        .then(status => sendResponse({ success: true, data: status }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    
    case 'CLEAR_CACHE':
      analysisCache.clear();
      sendResponse({ success: true, message: 'Cache cleared' });
      break;
    
    case 'GET_SETTINGS':
      chrome.storage.local.get(['apiUrl', 'autoAnalyze', 'showNotifications', 'cacheEnabled'], 
        (settings) => sendResponse({ success: true, data: settings }));
      return true;
    
    case 'UPDATE_SETTINGS':
      chrome.storage.local.set(request.data, () => {
        sendResponse({ success: true, message: 'Settings updated' });
      });
      return true;
    
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

function getCachedResult(url) {
  const cached = analysisCache.get(url);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.result;
  }
  analysisCache.delete(url);
  return null;
}

function cacheResult(url, result) {
  analysisCache.set(url, {
    result,
    timestamp: Date.now()
  });
}

async function analyzeUrl(url) {
  const cached = getCachedResult(url);
  if (cached) {
    return { ...cached, cached: true };
  }
  
  const settings = await new Promise(resolve => {
    chrome.storage.local.get(['apiUrl'], resolve);
  });
  const apiUrl = settings.apiUrl || DEFAULT_API_URL;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const response = await fetch(`${apiUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    cacheResult(url, result);
    
    return { ...result, cached: false };
    
  } catch (error) {
    throw error;
  }
}

async function checkApiStatus() {
  const settings = await new Promise(resolve => {
    chrome.storage.local.get(['apiUrl'], resolve);
  });
  const apiUrl = settings.apiUrl || DEFAULT_API_URL;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${apiUrl}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      return { status: 'online', service: data.service, version: data.version };
    }
    return { status: 'error', message: `HTTP ${response.status}` };
    
  } catch (error) {
    return { status: 'offline', message: error.message };
  }
}

async function showNotification(title, message, type = 'info') {
  const settings = await new Promise(resolve => {
    chrome.storage.local.get(['showNotifications'], resolve);
  });
  
  if (!settings.showNotifications) return;
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message,
    priority: 2
  });
}