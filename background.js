
/**
 * YouTube AI Assistant - Background Script
 * Gestisce la comunicazione tra i componenti dell'estensione e gestisce l'accesso alle API
 */

// Ascolta i messaggi dai content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'transcriptFetched') {
    // Log del successo del fetch della trascrizione
  }
  
  if (message.action === 'transcriptError') {
    // Log degli errori del fetch della trascrizione
  }

  // Permetti risposta asincrona
  return true;
});

// Ascolta i cambiamenti di tab per re-iniettare il content script se necessario
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    // Pagina video YouTube caricata/cambiata, potrebbe essere necessario re-inizializzare
    chrome.tabs.sendMessage(tabId, { action: 'checkInit' }, (response) => {
      // Se non c'è risposta, il content script potrebbe non essere ancora caricato
      if (chrome.runtime.lastError) {
        // Non c'è bisogno di gestire questo errore - il content script sarà caricato
        // dai pattern di corrispondenza del manifest se necessario
      }
    });
  }
});

// Gestisci CORS per le richieste API OpenAI
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const responseHeaders = details.responseHeaders || [];
    
    // Controlla se questa è una risposta API da OpenAI
    if (details.url.startsWith('https://api.openai.com/')) {
      // Aggiungi header CORS per permettere l'accesso dalla nostra estensione
      const corsHeaders = [
        { name: 'Access-Control-Allow-Origin', value: '*' },
        { name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
        { name: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
      ];
      
      corsHeaders.forEach(header => {
        // Aggiungi l'header se non esiste
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
