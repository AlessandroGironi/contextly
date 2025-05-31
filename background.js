/**
 * YouTube AI Assistant - Background Script (Optimized)
 * Handles essential communication and CORS management
 */

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`Background received: ${message.action} from tab ${sender.tab?.id}`);
  return true; // Allow async response
});

// Handle CORS for OpenAI API requests
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.url.startsWith('https://api.openai.com/')) {
      const responseHeaders = details.responseHeaders || [];

      // Add CORS headers
      const corsHeaders = [
        { name: 'Access-Control-Allow-Origin', value: '*' },
        { name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
        { name: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
      ];

      corsHeaders.forEach(header => {
        if (!responseHeaders.some(h => h.name.toLowerCase() === header.name.toLowerCase())) {
          responseHeaders.push(header);
        }
      });

      return { responseHeaders };
    }
  },
  { urls: ['https://api.openai.com/*'] },
  ['responseHeaders', 'extraHeaders']
);