/**
 * YouTube AI Assistant - Sidebar Component (Optimized)
 * Handles sidebar UI and AI interactions efficiently
 */
document.addEventListener('DOMContentLoaded', function() {
  let currentVideoId = '';
  let currentVideoTitle = '';
  let isProcessing = false;

  // Elements (Retained from original code)
  const chatTab = document.getElementById('chat-tab');
  const transcriptTab = document.getElementById('transcript-tab');
  const chatSection = document.getElementById('chat-section');
  const transcriptSection = document.getElementById('transcript-section');
  const questionInput = document.getElementById('question-input');
  const sendQuestionBtn = document.getElementById('send-question');
  const chatMessages = document.getElementById('chat-messages');
  const apiKeyMissing = document.getElementById('api-key-missing');
  const apiKeyConfiguredEl = document.getElementById('api-key-configured');
  const apiKeyInput = document.getElementById('api-key-input');
  const saveApiKeyBtn = document.getElementById('save-api-key');
  const changeApiKeyBtn = document.getElementById('change-api-key');
  let transcript = [];
  let currentPlaybackTime = 0;
  let activeTranscriptSegment = null;

  // Initialize UI
  initUI();

  function initUI() {
    // Simple initialization - content script handles most UI creation
    console.log("Sidebar initialized");

    // Tab switching - only chat tab is visible to users
    if (chatTab) {
      chatTab.addEventListener('click', () => switchTab('chat'));
      // We've hidden the transcript tab, but the code stays for backend functionality
    }
    
    // Chat input handling
    if (questionInput && sendQuestionBtn) {
      questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (!isProcessing && questionInput.value.trim() !== '') {
            sendQuestion();
          }
        }
      });
      
      sendQuestionBtn.addEventListener('click', () => {
        if (!isProcessing && questionInput.value.trim() !== '') {
          sendQuestion();
        }
      });
    }
    
    // API Key handling
    if (saveApiKeyBtn && apiKeyInput) {
      saveApiKeyBtn.addEventListener('click', saveApiKey);
    }
    
    if (changeApiKeyBtn) {
      changeApiKeyBtn.addEventListener('click', showApiKeyInput);
    }

    // Check for API key
    checkApiKeyStatus();
  }

  // Switch between tabs (now simplified as we only show chat tab)
  function switchTab(tab) {
    // Always default to chat tab since transcript tab is hidden
    const chatTab = document.getElementById('chat-tab');
    const chatSection = document.getElementById('chat-section');
    const transcriptSection = document.getElementById('transcript-section');

    chatTab.classList.add('active');
    chatSection.classList.add('active');
    transcriptSection.classList.remove('active');
  }

  // Check API key status
  async function checkApiKeyStatus() {
    try {
      const data = await new Promise((resolve) => {
        chrome.storage.sync.get('openai_api_key', resolve);
      });

      const isConfigured = !!(data?.openai_api_key);
      updateApiKeyStatus(isConfigured);

      if (isConfigured && window.OpenAIClient) {
        window.OpenAIClient.apiKey = data.openai_api_key;
        window.OpenAIClient.isConfigured = true;
      }

      return isConfigured;
    } catch (error) {
      console.error('Error checking API key:', error);
      return false;
    }
  }

  // Update API key status UI
  function updateApiKeyStatus(configured) {
    const apiKeyMissing = document.getElementById('api-key-missing');
    const apiKeyConfiguredEl = document.getElementById('api-key-configured');
    const questionInput = document.getElementById('question-input');
    const sendQuestionBtn = document.getElementById('send-question');

    if (configured) {
      apiKeyMissing.style.display = 'none';
      apiKeyConfiguredEl.style.display = 'flex';
      questionInput.disabled = false;
      sendQuestionBtn.disabled = false;
    } else {
      apiKeyMissing.style.display = 'block';
      apiKeyConfiguredEl.style.display = 'none';
      questionInput.disabled = true;
      sendQuestionBtn.disabled = true;
    }

    // Notify parent window
    if (window.parent) {
      window.parent.postMessage({
        action: 'apiKeyStatus',
        data: { configured }
      }, '*');
    }
  }

  // Save API key - simplified for built-in key
  async function saveApiKey() {
    // Nothing to save as we're using a built-in key
    console.log("Using built-in API key - no need to save custom key");
    
    // Update UI to reflect the API key is configured
    updateApiKeyStatus(true);
    
    // Add info message
    addChatMessage('system', 'This extension uses a built-in API key. You can ask questions right away!');
    
    // Switch to chat tab
    switchTab('chat');
  }
  
  // Show API key input - simplified for built-in key
  function showApiKeyInput() {
    // Nothing to configure as we're using a built-in key
    console.log("Using built-in API key - no configuration needed");
    
    // Add info message
    addChatMessage('system', 'This extension uses a built-in API key. No configuration needed!');
    
    // Make sure UI shows configured state
    const apiKeyMissing = document.getElementById('api-key-missing');
    const apiKeyConfiguredEl = document.getElementById('api-key-configured');

    apiKeyMissing.style.display = 'none';
    apiKeyConfiguredEl.style.display = 'flex';
  }

  // Send question to OpenAI
  function sendQuestion() {
    const question = questionInput.value.trim();
    
    if (!question || isProcessing) {
      return;
    }
    
    // Add user message to chat
    addChatMessage('user', question);
    
    // Clear input
    questionInput.value = '';
    
    // Show loading indicator
    addLoadingMessage();
    isProcessing = true;
    
    // CRITICAL: Log current video info before sending question
    console.log(`Sending question about video: "${currentVideoTitle}" (${currentVideoId})`);
    console.log(`Question submitted at: ${new Date().toISOString()}`);
    
    // IMPORTANT: Request precise timestamp from content script FIRST
    // Force the content script to read currentTime at this exact moment
    if (window.parent) {
      console.log('Requesting real-time timestamp from content script...');
      window.parent.postMessage({
        action: 'getPreciseTimestampAndProcess',
        question: question,
        videoId: currentVideoId,
        videoTitle: currentVideoTitle,
        requestTime: Date.now() // Add timestamp of when we made the request
      }, '*');
    }
  }

  // Add user or assistant message to chat
  function addChatMessage(role, content) {
    const messageEl = document.createElement('div');
    messageEl.className = `yt-chat-message ${role}`;
    
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.textContent = content;
    
    messageEl.appendChild(contentEl);
    chatMessages.appendChild(messageEl);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageEl;
  }
  
  // Add loading message
  function addLoadingMessage() {
    const messageEl = document.createElement('div');
    messageEl.className = 'yt-chat-message loading';
    messageEl.id = 'loading-message';
    
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    
    const loadingDots = document.createElement('div');
    loadingDots.className = 'loading-dots';
    
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      loadingDots.appendChild(dot);
    }
    
    contentEl.appendChild(loadingDots);
    messageEl.appendChild(contentEl);
    chatMessages.appendChild(messageEl);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageEl;
  }
  
  // Remove loading message
  function removeLoadingMessage() {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
      loadingMessage.remove();
    }
    isProcessing = false;
  }
  
  // Handle response from OpenAI
  function handleAIResponse(response) {
    removeLoadingMessage();
    
    if (response.error) {
      addChatMessage('system', `Error: ${response.error}`);
    } else {
      addChatMessage('assistant', response.answer);
    }
  }
  
  // Get relevant transcript section based on question and current playback time
  function getRelevantTranscript(question) {
    console.log(`Getting relevant transcript for question: "${question}"`);
    console.log(`Current video ID: ${currentVideoId}, transcript segments: ${transcript ? transcript.length : 0}`);
    
    // CRITICAL FIX: Even if transcript appears empty, pass some metadata to help the content script
    if (!transcript || transcript.length === 0) {
      console.warn("No transcript available to answer question!");
      // Return video title metadata so it can still be used in AI prompts
      return `VIDEO TITLE: ${currentVideoTitle}\n\nNo transcript available for this video.`;
    }
    
    // Check for "just said" type questions
    const justSaidPattern = /what (did|was) (he|she|they|it|the speaker|the narrator|the person|the presenter|the host) (just|recently) (say|said|talking about|referring to|mean|meant|mentioned)/i;
    
    // Check for "what is X" type questions
    const definitionPattern = /what (is|are|does|do) ([\w\s]+) mean/i;
    
    // Find current segment index
    let currentSegmentIndex = 0;
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i].start <= currentPlaybackTime && 
          (transcript[i].end >= currentPlaybackTime || i === transcript.length - 1)) {
        currentSegmentIndex = i;
        break;
      }
    }
    
    // If it's a "just said" type question, return a narrow context (30 seconds before)
    if (justSaidPattern.test(question)) {
      // Get 30 seconds of context before current time
      const contextStart = Math.max(0, currentPlaybackTime - 30);
      let contextSegments = [];
      
      for (let i = 0; i < transcript.length; i++) {
        if (transcript[i].start >= contextStart && transcript[i].end <= currentPlaybackTime) {
          contextSegments.push(transcript[i]);
        }
      }
      
      // If we found context segments, format and return them
      if (contextSegments.length > 0) {
        return formatTranscriptForAI(contextSegments);
      }
    }
    
    // If it's a definition question, we might want to search more broadly
    // or for other types of questions, provide a wider context (current segment and surrounding segments)
    
    // Get a window of segments (current + 5 before and after)
    const windowStart = Math.max(0, currentSegmentIndex - 5);
    const windowEnd = Math.min(transcript.length - 1, currentSegmentIndex + 5);
    
    const contextSegments = transcript.slice(windowStart, windowEnd + 1);
    
    return formatTranscriptForAI(contextSegments);
  }
  
  // Format transcript segments for AI prompt
  function formatTranscriptForAI(segments) {
    return segments.map(segment => {
      return `[${formatTime(segment.start)}] ${segment.text}`;
    }).join('\n');
  }
  
  // Update transcript content
  function updateTranscriptContent(transcript) {
    const contentEl = document.getElementById('yt-transcript-content');
    
    if (!contentEl) return;
    
    console.log(`Updating transcript content in sidebar, segments: ${transcript ? transcript.length : 0} for video: ${currentVideoId}`);
    
    if (!transcript || transcript.length === 0) {
      contentEl.innerHTML = '<div class="yt-transcript-error">No transcript available for this video.</div>';
      
      // If we have no transcript, make sure this is reflected in the chatMessages area too
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) {
        // Only add this message if it's not already there (avoid duplicates)
        const errorMessages = chatMessages.querySelectorAll('.message-content');
        let hasNoTranscriptMessage = false;
        
        for (let msg of errorMessages) {
          if (msg.textContent.includes('No transcript available') || 
              msg.textContent.includes('couldn\'t access the transcript')) {
            hasNoTranscriptMessage = true;
            break;
          }
        }
        
        if (!hasNoTranscriptMessage) {
          addChatMessage('system', `No transcript available for video: "${currentVideoTitle}"`);
        }
      }
      return;
    }
    
    let html = '<div class="yt-transcript-segments">';
    
    transcript.forEach((segment, index) => {
      const formattedTime = formatTime(segment.start);
      
      html += `
        <div class="yt-transcript-segment" data-start="${segment.start}" data-end="${segment.end || segment.start + 5}" data-index="${index}">
          <span class="yt-transcript-time">${formattedTime}</span>
          <span class="yt-transcript-text">${segment.text}</span>
        </div>
      `;
    });
    
    html += '</div>';
    contentEl.innerHTML = html;
    
    // Add click events to transcript segments
    addTranscriptClickEvents();
    
    // Update active segment based on current playback time
    updateActiveTranscriptSegment();
  }
  
  // Add click events to transcript segments
  function addTranscriptClickEvents() {
    const segments = document.querySelectorAll('.yt-transcript-segment');
    
    segments.forEach(segment => {
      segment.addEventListener('click', () => {
        const startTime = parseFloat(segment.getAttribute('data-start'));
        seekVideoToTime(startTime);
      });
    });
  }
  
  // Update active transcript segment based on current playback time
  function updateActiveTranscriptSegment() {
    if (!transcript || transcript.length === 0) return;
    
    // Remove active class from previous segment
    if (activeTranscriptSegment) {
      activeTranscriptSegment.classList.remove('active');
    }
    
    // Find segment that contains current playback time
    const segments = document.querySelectorAll('.yt-transcript-segment');
    
    for (const segment of segments) {
      const start = parseFloat(segment.getAttribute('data-start'));
      const end = parseFloat(segment.getAttribute('data-end') || start + 10);
      
      if (currentPlaybackTime >= start && currentPlaybackTime <= end) {
        segment.classList.add('active');
        activeTranscriptSegment = segment;
        
        // Scroll segment into view if needed
        const containerRect = transcriptSection.getBoundingClientRect();
        const segmentRect = segment.getBoundingClientRect();
        
        if (segmentRect.top < containerRect.top || segmentRect.bottom > containerRect.bottom) {
          segment.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        break;
      }
    }
  }
  
  // Format time in seconds to MM:SS format
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }
  
  // Send message to seek video to specific time
  function seekVideoToTime(seconds) {
    if (window.parent) {
      window.parent.postMessage({
        action: 'seekVideo',
        time: seconds
      }, '*');
    }
  }
  
  // Show loading indicator
  function showLoadingIndicator() {
    const loadingEl = document.getElementById('yt-transcript-loading');
    const contentEl = document.getElementById('yt-transcript-content');
    
    if (loadingEl && contentEl) {
      loadingEl.style.display = 'flex';
      contentEl.innerHTML = '';
    }
  }
  
  // Hide loading indicator
  function hideLoadingIndicator() {
    const loadingEl = document.getElementById('yt-transcript-loading');
    
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  }
  
  // Show error message
  function showErrorMessage(message) {
    const contentEl = document.getElementById('yt-transcript-content');
    
    if (contentEl) {
      contentEl.innerHTML = `<div class="yt-transcript-error">${message}</div>`;
    }
  }
  
  // Clear chat history on video change
  function clearChatHistory() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      // Keep only the initial welcome message
      const welcomeMessage = chatMessages.querySelector('.yt-chat-message.system:first-child');
      chatMessages.innerHTML = '';
      
      if (welcomeMessage) {
        chatMessages.appendChild(welcomeMessage);
      }
    }
    
    // Reset any UI state that should be cleared on video change
    removeLoadingMessage();
    isProcessing = false;
  }

  // Handle messages from parent window (Consolidated from original and edited)
  window.addEventListener('message', function(event) {
    if (!event.data?.action) return;

    const { action, data } = event.data;

    switch (action) {
      case 'updateVideoTitle':
        currentVideoId = data?.videoId || '';
        currentVideoTitle = data?.videoTitle || '';
        
        // Update "Now Playing" UI element if it exists
        const titleEl = document.getElementById('now-playing-title');
        if (titleEl) {
          titleEl.textContent = data.videoTitle;
        } else {
          // Create the Now Playing element if it doesn't exist
          const chatContainer = document.getElementById('chat-container');
          if (chatContainer) {
            const nowPlayingBar = document.createElement('div');
            nowPlayingBar.className = 'now-playing-bar';
            nowPlayingBar.innerHTML = `<span>Now playing:</span> <span id="now-playing-title">${data.videoTitle}</span>`;
            
            // Insert at the top of chat container, right after the header
            chatContainer.insertBefore(nowPlayingBar, chatContainer.firstChild);
          }
        }
        
        // Update current video title in sidebar header if it exists
        const currentVideoTitleEl = document.getElementById('current-video-title');
        if (currentVideoTitleEl) {
          currentVideoTitleEl.textContent = data.videoTitle;
        }
        break;

      case 'newVideo':
        currentVideoId = data?.videoId || '';
        currentVideoTitle = data?.videoTitle || '';
        isProcessing = false;

        // Reset all state variables related to the previous video
        transcript = [];
        currentPlaybackTime = 0;
        activeTranscriptSegment = null;

        // Update "Now Playing" UI element if it exists
        const nowPlayingEl = document.getElementById('now-playing-title');
        if (nowPlayingEl) {
          nowPlayingEl.textContent = data.videoTitle;
        } else {
          // Create the Now Playing element if it doesn't exist
          const chatContainer = document.getElementById('chat-container');
          if (chatContainer) {
            const nowPlayingBar = document.createElement('div');
            nowPlayingBar.className = 'now-playing-bar';
            nowPlayingBar.innerHTML = `<span>Now playing:</span> <span id="now-playing-title">${data.videoTitle}</span>`;
            
            // Insert at the top of chat container, right after the header
            chatContainer.insertBefore(nowPlayingBar, chatContainer.firstChild);
          }
        }
        
        // Update current video title in sidebar header if it exists
        const currentVideoTitleEl = document.getElementById('current-video-title');
        if (currentVideoTitleEl) {
          currentVideoTitleEl.textContent = data.videoTitle;
        }

        // Always clear chat history when switching videos to prevent context contamination
        clearChatHistory();
        
        // Add a more informative welcome message for new video
        addChatMessage('system', `Now watching: "${data.videoTitle}" - Ask me any questions about this video!`);
        
        // Reset loading indicator if it's active
        removeLoadingMessage();
        
        // Always switch to chat tab
        switchTab('chat');
        break;

      case 'apiKeyStatus':
        if (data?.configured !== undefined) {
          updateApiKeyStatus(data.configured);
        }

        // Show success or error message if provided
        if (data.message) {
          addChatMessage('system', data.message);
        }
        
        if (data.error) {
          showErrorMessage(`Error: ${data.error}`);
        }
        break;

      case 'aiResponse':
        handleAIResponse(data);
        break;

      case 'transcriptUpdated':
        console.log(`Sidebar received transcript update for video: ${data.videoId}`);
        
        // Update current video info if included in the message
        if (data.videoId) {
          currentVideoId = data.videoId;
        }
        
        if (data.videoTitle) {
          currentVideoTitle = data.videoTitle;
        }
        
        // Update our transcript data
        if (data.transcript) {
          transcript = data.transcript;
          updateTranscriptContent(transcript);
        } else {
          // Clear transcript if none available
          transcript = [];
          updateTranscriptContent([]);
        }
        
        // If there was an error, show it as a system message
        if (data.error) {
          addChatMessage('system', `Transcript error: ${data.error}`);
        }
        break;
        
      case 'updatePlaybackTime':
        currentPlaybackTime = data.time;
        updateActiveTranscriptSegment();
        break;

      case 'showLoading':
        showLoadingIndicator();
        break;
        
      case 'hideLoading':
        hideLoadingIndicator();
        break;
        
      case 'showError':
        showErrorMessage(data.message);
        break;

      case 'preciseTimestampReceived':
        // Process the question with the precise timestamp received from content script
        const preciseTime = data.currentTime;
        currentPlaybackTime = preciseTime; // Update our stored time
        
        console.log(`Received precise timestamp: ${preciseTime}s, processing question: "${data.question}"`);
        
        // Get relevant transcript section using the precise timestamp
        const relevantTranscript = getRelevantTranscript(data.question);
        
        // Add video title to the transcript context if it's not already included
        let enhancedTranscript = relevantTranscript;
        if (!enhancedTranscript.includes("VIDEO TITLE:")) {
          enhancedTranscript = `VIDEO TITLE: ${currentVideoTitle}\n\n${enhancedTranscript}`;
        }
        
        // Now send the question with the precise timestamp
        if (window.parent) {
          window.parent.postMessage({
            action: 'processQuestion',
            question: data.question,
            transcript: enhancedTranscript,
            videoId: currentVideoId,
            videoTitle: currentVideoTitle,
            currentTime: preciseTime, // Use the precise timestamp
            timestamp: Date.now()
          }, '*');
        }
        break;
    }
  });
});