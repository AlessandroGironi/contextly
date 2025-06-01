/**
 * YouTube AI Assistant - Sidebar Component
 * Handles sidebar UI interactions and AI chat functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // State
  let transcript = [];
  let currentVideoId = '';
  let currentVideoTitle = '';
  let currentPlaybackTime = 0;
  let isApiKeyConfigured = false;
  let isProcessing = false;
  let activeTranscriptSegment = null;

  // Extract video ID from URL if present (for direct communication)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('v')) {
    currentVideoId = urlParams.get('v');
    console.log("Sidebar initialized with video ID from URL:", currentVideoId);
  }

  // Elements
  const chatTab = document.getElementById('chat-tab');
  const transcriptTab = document.getElementById('transcript-tab');
  const settingsTab = document.getElementById('settings-tab');
  const chatSection = document.getElementById('chat-section');
  const transcriptSection = document.getElementById('transcript-section');
  const settingsSection = document.getElementById('settings-section');
  const questionInput = document.getElementById('question-input');
  const sendQuestionBtn = document.getElementById('send-question');
  const chatMessages = document.getElementById('chat-messages');
  const apiKeyMissing = document.getElementById('api-key-missing');
  const apiKeyConfiguredEl = document.getElementById('api-key-configured');
  const apiKeyInput = document.getElementById('api-key-input');
  const saveApiKeyBtn = document.getElementById('save-api-key');
  const changeApiKeyBtn = document.getElementById('change-api-key');
  const voiceInputBtn = document.getElementById('voice-input-btn');
  const voiceStatus = document.getElementById('voice-status');
  const voiceStatusText = document.getElementById('voice-status-text');

  // Initialize UI
  initUI();

  // Initialize functions
  function initUI() {
    // Initialize localization first
    if (window.LocalizationManager) {
      window.LocalizationManager.translatePage();
    }

    // Tab switching
    if (chatTab) {
      chatTab.addEventListener('click', () => switchTab('chat'));
    }
    if (transcriptTab) {
      transcriptTab.addEventListener('click', () => switchTab('transcript'));
    }
    if (settingsTab) {
      settingsTab.addEventListener('click', () => switchTab('settings'));
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

      questionInput.addEventListener('focus', handleTypingStart);
      questionInput.addEventListener('blur', handleTypingEnd);

      // Start smart pause when user starts typing
      questionInput.addEventListener('keydown', (e) => {
        if (!isSmartPauseEnabled) return;
        
        // Don't trigger smart pause for Enter key (since that sends the message)
        if (e.key !== 'Enter') {
          handleTypingStart();
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

    // Check if API key is already configured
    checkApiKeyStatus();

    // Initialize Smart Pause functionality
    const smartPauseCheckbox = document.getElementById('smart-pause-checkbox');
    if (smartPauseCheckbox) {
      // Set checkbox to reflect saved setting
      smartPauseCheckbox.checked = isSmartPauseEnabled;
      console.log(`Sidebar checkbox set to: ${isSmartPauseEnabled}`);
      
      smartPauseCheckbox.addEventListener('change', (e) => {
        isSmartPauseEnabled = e.target.checked;
        // Save setting to localStorage
        localStorage.setItem('yt-ai-smart-pause-enabled', isSmartPauseEnabled.toString());
        console.log(`Sidebar Smart Pause Mode ${isSmartPauseEnabled ? 'enabled' : 'disabled'} and saved to localStorage`);
      });
    } else {
      console.warn('Smart Pause checkbox not found in sidebar');
    }

    // Initialize Voice Input functionality
    initializeVoiceInput();
  }

  // Handle messages from content script
  window.addEventListener('message', function(event) {
    // First, check if we're receiving a YouTube AI Assistant message
    if (!event.data || (event.data.source !== 'yt-ai-assistant' && !event.data.action)) {
      return; // Ignore messages from other sources
    }

    const { action, data } = event.data;
    console.log("Sidebar received message:", action, data);

    switch (action) {
      case 'updateTranscript':
      case 'transcriptUpdated': // Handle both action names for compatibility
        // Log what we're receiving for debugging
        console.log(`Sidebar received transcript update for action ${action}`, 
          data ? `videoId: ${data.videoId}, segments: ${data.transcript ? data.transcript.length : 0}` : 'No data');

        // CRITICAL FIX: Only update if we're getting data for the current video or a new video
        // This prevents old transcript data from overwriting new data
        if (data && data.videoId) {
          const isNewVideo = data.videoId !== currentVideoId;

          // Clear previous transcript first before setting the new one
          transcript = [];

          // Update video ID and title
          currentVideoId = data.videoId || '';
          currentVideoTitle = data.videoTitle || '';

          // Only update transcript if we received proper data
          if (data.transcript && Array.isArray(data.transcript)) {
            transcript = data.transcript;
            console.log(`Updated transcript for video ${currentVideoId} with ${transcript.length} segments`);

            // Update UI with the new transcript
            updateTranscriptContent(transcript);

            // Always switch to chat tab when new transcript is loaded for a new video
            // This ensures we stay in chat mode when navigating between videos
            if (isNewVideo) {
              switchTab('chat');
              // If it's a new video, add a system message
              addChatMessage('system', t('transcript_loaded', { title: currentVideoTitle }));
            }
          } else {
            console.warn("Received invalid transcript data:", data.transcript);
            // Show error in transcript content
            updateTranscriptContent([]);
          }
        } else {
          console.warn("Received empty or invalid transcript update");
          // Show error in transcript content but don't reset current transcript
          const contentEl = document.getElementById('yt-transcript-content');
          if (contentEl && (!transcript || transcript.length === 0)) {
            contentEl.innerHTML = '<div class="yt-transcript-error">No transcript available for this video.</div>';
          }
        }
        break;

      case 'resetState':
      case 'resetTranscript':
        // Clear state when video changes
        console.log("Sidebar state reset triggered for action:", action);
        transcript = [];
        currentPlaybackTime = 0;

        // Clear chat messages only on full reset
        if (action === 'resetState' && chatMessages) {
          chatMessages.innerHTML = '';
        }

        // Clear transcript content
        const contentEl = document.getElementById('yt-transcript-content');
        if (contentEl) {
          contentEl.innerHTML = '<div class="yt-transcript-message">Loading transcript...</div>';
        }

        // Update videoId and title if provided in the message
        if (event.data.videoId) {
          currentVideoId = event.data.videoId;
          console.log("Updated currentVideoId to:", currentVideoId);
        }

        if (event.data.videoTitle) {
          currentVideoTitle = event.data.videoTitle;
          console.log("Updated currentVideoTitle to:", currentVideoTitle);
        }
        break;

      case 'newVideo':
        // Update video info for new video
        if (data) {
          currentVideoId = data.videoId || '';
          currentVideoTitle = data.videoTitle || '';
          console.log(`Sidebar received new video: ${currentVideoTitle} (${currentVideoId})`);

          // Clear chat if requested
          if (data.clearChat && chatMessages) {
            chatMessages.innerHTML = '';
            addChatMessage('system', `New video detected: "${currentVideoTitle}"`);
          }
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

      case 'apiKeyStatus':
        updateApiKeyStatus(data.configured);
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

  // Switch between tabs
  function switchTab(tab) {
    console.log(`Switching to tab: ${tab}`);
    
    // Remove active class from all tabs and sections
    if (chatTab) chatTab.classList.remove('active');
    if (transcriptTab) transcriptTab.classList.remove('active');
    if (settingsTab) settingsTab.classList.remove('active');
    if (chatSection) chatSection.classList.remove('active');
    if (transcriptSection) transcriptSection.classList.remove('active');
    if (settingsSection) settingsSection.classList.remove('active');

    // Add active class to selected tab and section
    switch(tab) {
      case 'chat':
        if (chatTab) chatTab.classList.add('active');
        if (chatSection) chatSection.classList.add('active');
        break;
      case 'transcript':
        if (transcriptTab) transcriptTab.classList.add('active');
        if (transcriptSection) transcriptSection.classList.add('active');
        break;
      case 'settings':
        if (settingsTab) settingsTab.classList.add('active');
        if (settingsSection) settingsSection.classList.add('active');
        break;
      default:
        // Default to chat tab
        if (chatTab) chatTab.classList.add('active');
        if (chatSection) chatSection.classList.add('active');
    }
  }

  // Check API key status - simplified for built-in key
  async function checkApiKeyStatus() {
    console.log("Using built-in API key - no need to check storage");

    // Set status to configured
    updateApiKeyStatus(true);

    // Notify parent window that API key is available
    if (window.parent) {
      window.parent.postMessage({ 
        action: 'apiKeyReady'
      }, '*');
    }

    return true;
  }

  // Update API key status UI
  function updateApiKeyStatus(configured) {
    isApiKeyConfigured = configured;

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
    apiKeyMissing.style.display = 'none';
    apiKeyConfiguredEl.style.display = 'flex';
  }

  // Send question to OpenAI
  function sendQuestion() {
    const question = questionInput.value.trim();

    if (!question || isProcessing) {
      return;
    }

    // Resume video if smart pause was active
    if (isTyping) {
      handleTypingEnd();
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
          addChatMessage('system', t('no_transcript_video', { title: currentVideoTitle }));
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

  // Smart Pause Mode functions
  let isSmartPauseEnabled = true; // Enabled by default
  let isTyping = false;
  let typingTimeout = null;

  // Voice Input Manager
  let voiceInputManager = null;
  let isVoiceInputEnabled = true; // Enabled by default
  let isVoiceListening = false;

  // Load Smart Pause setting from localStorage
  const savedSmartPauseSetting = localStorage.getItem('yt-ai-smart-pause-enabled');
  if (savedSmartPauseSetting !== null) {
    isSmartPauseEnabled = savedSmartPauseSetting === 'true';
    console.log(`Sidebar loaded Smart Pause setting: ${isSmartPauseEnabled}`);
  } else {
    // First time usage - save the default value
    isSmartPauseEnabled = true;
    localStorage.setItem('yt-ai-smart-pause-enabled', 'true');
    console.log('Sidebar first time - saved default Smart Pause: true');
  }

  function handleTypingStart() {
    if (!isSmartPauseEnabled) return;

    if (!isTyping) {
      isTyping = true;
      console.log('User started typing - pausing video');

      // Send message to parent window to pause video
      if (window.parent) {
        window.parent.postMessage({
          action: 'pauseVideo',
          reason: 'smartPause'
        }, '*');
      }
    }

    // Clear any existing timeout (we don't want auto-resume anymore)
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }
  }

  function handleTypingEnd() {
    if (!isTyping) return;

    isTyping = false;
    console.log('User stopped typing - resuming video');

    // Clear timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }

    // Send message to parent window to resume video
    if (window.parent) {
      window.parent.postMessage({
        action: 'resumeVideo',
        reason: 'smartPause'
      }, '*');
    }
  }

  // Initialize Voice Input
  function initializeVoiceInput() {
    // Load voice input setting
    const savedVoiceInputSetting = localStorage.getItem('yt-ai-voice-input-enabled');
    if (savedVoiceInputSetting !== null) {
      isVoiceInputEnabled = savedVoiceInputSetting === 'true';
    } else {
      isVoiceInputEnabled = true;
      localStorage.setItem('yt-ai-voice-input-enabled', 'true');
    }

    // Initialize voice input manager with a delay to ensure DOM is ready
    setTimeout(() => {
      if (window.VoiceInputManager) {
        voiceInputManager = new window.VoiceInputManager();
        
        // Set callbacks
        voiceInputManager.setCallbacks(
          handleVoiceResult,
          handleVoiceError,
          handleVoiceStatus
        );

        // Update UI based on support and settings
        updateVoiceInputUI();
        
        console.log('Voice input manager initialized, supported:', voiceInputManager.getState().isSupported);
      } else {
        console.warn('VoiceInputManager not available');
        // Still show the button for debugging - user can see if it works
        if (voiceInputBtn) {
          voiceInputBtn.style.display = 'flex';
        }
      }
    }, 100);

    // Set up voice input checkbox
    const voiceInputCheckbox = document.getElementById('voice-input-checkbox');
    if (voiceInputCheckbox) {
      voiceInputCheckbox.checked = isVoiceInputEnabled;
      
      voiceInputCheckbox.addEventListener('change', (e) => {
        isVoiceInputEnabled = e.target.checked;
        localStorage.setItem('yt-ai-voice-input-enabled', isVoiceInputEnabled.toString());
        
        if (voiceInputManager) {
          voiceInputManager.setEnabled(isVoiceInputEnabled);
        }
        
        updateVoiceInputUI();
        console.log(`Voice Input ${isVoiceInputEnabled ? 'enabled' : 'disabled'}`);
      });
    }

    // Set up voice input button
    if (voiceInputBtn) {
      voiceInputBtn.addEventListener('click', handleVoiceInputClick);
      // Force show the button initially for debugging
      voiceInputBtn.style.display = 'flex';
      console.log('Voice input button found and event listener added');
    } else {
      console.warn('Voice input button not found in DOM');
    }
  }

  // Update voice input UI visibility and state
  function updateVoiceInputUI() {
    if (!voiceInputBtn) {
      console.warn('Voice input button not found for UI update');
      return;
    }

    const state = voiceInputManager ? voiceInputManager.getState() : { isSupported: false };
    
    console.log('Updating voice UI - supported:', state.isSupported, 'enabled:', isVoiceInputEnabled);
    
    // Show/hide voice button based on support and enabled setting
    if (state.isSupported && isVoiceInputEnabled) {
      voiceInputBtn.style.display = 'flex';
      console.log('Voice button shown');
    } else if (!state.isSupported) {
      voiceInputBtn.style.display = 'none';
      console.log('Voice button hidden - not supported');
      // Show a message to user
      if (!state.isSupported && isVoiceInputEnabled) {
        addChatMessage('system', 'Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
      }
    } else {
      voiceInputBtn.style.display = 'none';
      console.log('Voice button hidden - disabled in settings');
    }

    // Update button state
    if (isVoiceListening) {
      voiceInputBtn.classList.add('listening');
    } else {
      voiceInputBtn.classList.remove('listening');
    }
  }

  // Handle voice input button click
  function handleVoiceInputClick() {
    if (!voiceInputManager) return;

    if (isVoiceListening) {
      // Stop listening
      voiceInputManager.stopListening();
    } else {
      // Start listening
      const success = voiceInputManager.startListening();
      if (success) {
        // Start voice pause (similar to smart pause)
        handleVoiceStart();
      }
    }
  }

  // Handle voice recognition result
  function handleVoiceResult(transcript) {
    if (!transcript || !transcript.trim()) return;

    console.log('Voice input received:', transcript);

    // Set the transcript in the input field
    if (questionInput) {
      questionInput.value = transcript;
    }

    // Hide voice status
    hideVoiceStatus();

    // End voice pause
    handleVoiceEnd();

    // Send the question automatically
    if (!isProcessing && transcript.trim() !== '') {
      sendQuestion();
    }
  }

  // Handle voice recognition error
  function handleVoiceError(errorKey) {
    console.error('Voice input error:', errorKey);
    
    // Show error message
    showVoiceStatus(t(errorKey), 'error');
    
    // Hide after 3 seconds
    setTimeout(() => {
      hideVoiceStatus();
    }, 3000);

    // End voice pause
    handleVoiceEnd();
  }

  // Handle voice status changes
  function handleVoiceStatus(status) {
    switch (status) {
      case 'listening':
        isVoiceListening = true;
        showVoiceStatus(t('listening'));
        updateVoiceInputUI();
        break;
      case 'ended':
      case 'error':
        isVoiceListening = false;
        hideVoiceStatus();
        updateVoiceInputUI();
        break;
    }
  }

  // Show voice status indicator
  function showVoiceStatus(message, type = 'normal') {
    if (!voiceStatus || !voiceStatusText) return;

    voiceStatusText.textContent = message;
    voiceStatus.className = `yt-voice-status ${type}`;
    voiceStatus.style.display = 'block';
  }

  // Hide voice status indicator
  function hideVoiceStatus() {
    if (!voiceStatus) return;
    voiceStatus.style.display = 'none';
  }

  // Handle voice start (smart pause for voice)
  function handleVoiceStart() {
    if (!isSmartPauseEnabled) return;

    console.log('Voice input started - pausing video');

    // Send message to parent window to pause video
    if (window.parent) {
      window.parent.postMessage({
        action: 'pauseVideo',
        reason: 'voiceInput'
      }, '*');
    }
  }

  // Handle voice end (resume video)
  function handleVoiceEnd() {
    if (!isSmartPauseEnabled) return;

    console.log('Voice input ended - resuming video');

    // Send message to parent window to resume video
    if (window.parent) {
      window.parent.postMessage({
        action: 'resumeVideo',
        reason: 'voiceInput'
      }, '*');
    }
  }

  // Get localized text
  function t(key, params = {}) {
    if (window.LocalizationManager) {
      return window.LocalizationManager.t(key, params);
    }
    return key; // Fallback to key if localization not available
  }

  // Note: Main message handler is already defined above in the DOMContentLoaded event
  // This duplicate handler has been removed to prevent conflicts
});