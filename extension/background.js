/**
 * SHIELD_AI - Background Service Worker
 * Handles URL analysis and communication between content script and popup
 */

// Default API URL - can be changed in settings
const DEFAULT_API_URL = 'http://localhost:5000';
const API_TIMEOUT = 10000; // 10 seconds timeout

// Cache for analysis results
const analysisCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('🛡️ SHIELD_AI extension installed');
  
  // Set default settings
  chrome.storage.local.set({
    apiUrl: DEFAULT_API_URL,
    autoAnalyze: true,
    showNotifications: true,
    cacheEnabled: true
  });
});

// Message handler for communication with popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request.type);
  
  switch (request.type) {
    case 'ANALYZE_URL':
      analyzeUrl(request.data.url)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
    
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

/**
 * Check if URL is in cache
 */
function getCachedResult(url) {
  const cached = analysisCache.get(url);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.result;
  }
  analysisCache.delete(url);
  return null;
}

/**
 * Cache analysis result
 */
function cacheResult(url, result) {
  analysisCache.set(url, {
    result,
    timestamp: Date.now()
  });
}

/**
 * Analyze a URL for phishing
 */
async function analyzeUrl(url) {
  // Check cache first
  const cached = getCachedResult(url);
  if (cached) {
    console.log('✅ Using cached result for:', url);
    return { ...cached, cached: true };
  }
  
  // Get API URL from settings
  const settings = await new Promise(resolve => {
    chrome.storage.local.get(['apiUrl'], resolve);
  });
  const apiUrl = settings.apiUrl || DEFAULT_API_URL;
  
  console.log('🔍 Analyzing URL:', url);
  
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
    
    console.log('✅ Analysis complete:', result);
    return { ...result, cached: false };
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  }
}

/**
 * Check if API is available
 */
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

/**
 * Show notification
 */
async function showNotification(title, message, type = 'info') {
  const settings = await new Promise(resolve => {
    chrome.storage.local.get(['showNotifications'], resolve);
  });
  
  if (!settings.showNotifications) return;
  
  const icons = {
    safe: 'icons/icon128.png',
    warning: 'icons/icon128.png',
    danger: 'icons/icon128.png',
    info: 'icons/icon128.png'
  };
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: icons[type] || icons.info,
    title,
    message,
    priority: 2
  });
}

console.log('🛡️ SHIELD_AI background service worker ready');