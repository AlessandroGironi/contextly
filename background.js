
/**
 * YouTube AI Assistant - Background Script
 * Handles communication between extension components and manages API access
 */

// Handle CORS for OpenAI API requests
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const responseHeaders = details.responseHeaders || [];
    
    // Check if this is an API response from OpenAI
    if (details.url.startsWith('https://api.openai.com/')) {
      // Add CORS headers to allow access from our extension
      const corsHeaders = [
        { name: 'Access-Control-Allow-Origin', value: '*' },
        { name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
        { name: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
      ];
      
      corsHeaders.forEach(header => {
        // Add the header if it doesn't exist
        if (!responseHeaders.some(h => h.name.toLowerCase() === header.name.toLowerCase())) {
          responseHeaders.push(header);
        }
      });
    }
    
    return { responseHeaders };
  },
  { urls: ['https://api.openai.com/*'] },
  ['responseHeaders', 'extraHeaders']
);

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'transcriptFetched') {
    // Log successful transcript fetch
    console.log(`Transcript fetched for video ${message.videoId} using method: ${message.method}`);
  }
  
  if (message.action === 'transcriptError') {
    // Log transcript fetch errors
    console.error(`Error fetching transcript for ${message.videoId}:`, message.error);
  }

  if (message.action === 'videoChanged') {
    // Log video changes
    console.log(`Video changed from ${message.oldVideoId} to ${message.newVideoId}`);
  }

  // Allow async response
  return true;
});

// Listen for tab changes to re-inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    // YouTube video page loaded/changed, might need to re-initialize
    chrome.tabs.sendMessage(tabId, { action: 'checkInit' }, (response) => {
      // If no response, the content script may not be loaded yet
      if (chrome.runtime.lastError) {
        // No need to handle this error - content script will be loaded
        // by manifest match patterns if needed
      }
    });
  }
});
