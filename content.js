/**
 * YouTube AI Assistant - Content Script
 * Injects and controls the AI assistant sidebar on YouTube video pages
 */

// Main object to handle AI assistant functionality
const YouTubeAIAIAssistant = {
  sidebarContainer: null,
  sidebarVisible: false,
  videoId: null,
  videoTitle: '',
  transcript: [],
  playbackTracker: null,
  currentPlaybackTime: 0,

  // Initialize the AI assistant
  init: async function() {
    // Extract video ID and title from the page
    this.extractVideoInfo();

    if (!this.videoId) {
      console.error("YouTube AI Assistant: Could not extract video IDs");
      return;
    }

    // Create sidebar container if it doesn't exist
    if (!this.sidebarContainer) {
      this.createSidebar();
    }

    // Check if OpenAI API key is configured
    // We handle this in setupEventListeners now, so no need to call separately
    // It will be called after DOM elements are available

    // Show the sidebar
    this.showSidebar();

    // Load the transcript
    await this.loadTranscript();

    // Start tracking video playback
    this.startPlaybackTracking();

    // Add event listeners for page navigation
    this.addEventListeners();
  },

  // Extract video ID and title from YouTube page
  extractVideoInfo: function() {
    const urlParams = new URLSearchParams(window.location.search);
    this.videoId = urlParams.get('v');

    // Try multiple selector patterns to get the video title - YouTube's DOM structure can vary
    const selectors = [
      'h1.ytd-video-primary-info-renderer',
      'h1.title.style-scope.ytd-video-primary-info-renderer',
      '#title h1',
      '#above-the-fold #title',
      'ytd-watch-metadata h1.title'
    ];

    let titleFound = false;

    // Try each selector
    for (const selector of selectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement && titleElement.textContent.trim()) {
        this.videoTitle = titleElement.textContent.trim();
        titleFound = true;
        break;
      }
    }

    // If we still don't have a title, fall back to document title
    if (!titleFound) {
      const docTitle = document.title;
      if (docTitle && docTitle.includes(' - YouTube')) {
        this.videoTitle = docTitle.replace(' - YouTube', '');
      } else {
        this.videoTitle = 'YouTube Video';
      }
    }

    console.log(`Video ID: ${this.videoId}, Title: ${this.videoTitle}`);

    // Update video title in the sidebar if it exists
    if (this.sidebarContainer) {
      const titleElement = this.sidebarContainer.querySelector('#current-video-title');
      if (titleElement) {
        titleElement.textContent = this.videoTitle;
      }

      // Also notify sidebar frame about the title update
      this.postMessageToSidebar({
        action: 'updateVideoTitle',
        data: { 
          videoId: this.videoId,
          videoTitle: this.videoTitle
        }
      });
    }
  },

  // Create sidebar container and inject HTML
  createSidebar: function() {
    // Create container
    this.sidebarContainer = document.createElement('div');
    this.sidebarContainer.id = 'yt-ai-assistant-container';
    this.sidebarContainer.classList.add('yt-sidebar');

    // Create direct HTML instead of loading from file
    this.sidebarContainer.innerHTML = `
      <div class="yt-sidebar-header">
        <div class="yt-sidebar-tabs">
          <button id="chat-tab" class="yt-sidebar-tab active">ChatBot</button>
          <button id="transcript-tab" class="yt-sidebar-tab">Transcript</button>
        </div>
        <div class="yt-sidebar-controls">
          <button id="yt-sidebar-minimize" class="yt-sidebar-button" title="Minimize sidebar">−</button>
          <button id="yt-sidebar-close" class="yt-sidebar-button" title="Close sidebar">×</button>
        </div>
      </div>
      <div id="current-video-info" class="yt-video-info">
        <span id="current-video-title"></span>
      </div>

      <!-- Chat Section -->
      <div id="chat-section" class="yt-sidebar-section active">
        <div id="chat-container" class="yt-chat-container">
          <div class="yt-chat-messages" id="chat-messages">
            <div class="yt-chat-message system">
              <div class="message-content">
                I'm your YouTube assistant. Ask me anything about this video!
              </div>
            </div>
          </div>

          <div id="api-key-missing" class="yt-api-key-missing">
            <p>Please enter your OpenAI API key to use the AI assistant:</p>
            <div class="yt-api-key-input-container">
              <input type="password" id="api-key-input" placeholder="sk-..." class="yt-api-key-input">
              <button id="save-api-key" class="yt-api-key-save">Save</button>
            </div>
            <p class="yt-api-key-info">Your API key is stored locally and only used to communicate with OpenAI.</p>
          </div>

          <div id="api-key-configured" class="yt-api-key-configured" style="display: none;">
            <p>OpenAI API key configured</p>
            <button id="change-api-key" class="yt-change-api-key">Change key</button>
          </div>

          <div class="yt-chat-input">
            <textarea id="question-input" placeholder="Ask about this video..." disabled></textarea>
            <button id="send-question" disabled>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Transcript Section -->
      <div id="transcript-section" class="yt-sidebar-section">
        <div id="yt-transcript-loading" class="yt-transcript-loading">
          <div class="yt-transcript-spinner"></div>
          <p>Loading transcript...</p>
        </div>
        <div id="yt-transcript-content" class="yt-transcript-text-content">
          <!-- Transcript content will be loaded here -->
        </div>
      </div>
    `;

    // Inject into page
    document.body.appendChild(this.sidebarContainer);

    // Set up event listeners and message handlers
    this.setupEventListeners();
  },

  // Set up event listeners and message handlers
  setupEventListeners: function() {
    // Check API key status right after UI is set up
    this.checkApiKeyStatus();

    // Update video title in the sidebar
    this.updateVideoInfo();

    // Global message handler
    window.addEventListener('message', event => {
      // Make sure event.data exists and has action property
      if (!event.data || !event.data.action) return;

      const { action, data } = event.data;

      switch (action) {
        case 'closeSidebar':
          this.hideSidebar();
          break;

        case 'minimizeSidebar':
          this.toggleMinimize();
          break;

        case 'seekVideo':
          this.seekVideoToTime(data.time);
          break;

        case 'checkApiKey':
          this.checkApiKeyStatus();
          break;

        case 'saveApiKey':
          this.saveApiKey(data.apiKey);
          break;

        case 'changeApiKey':
          // Show API key input and hide configured message
          const apiKeyMissing = document.getElementById('api-key-missing');
          const apiKeyConfigured = document.getElementById('api-key-configured');
          if (apiKeyMissing) apiKeyMissing.style.display = 'block';
          if (apiKeyConfigured) apiKeyConfigured.style.display = 'none';
          break;

        case 'getCurrentTimestamp':
          // ALWAYS get precise current timestamp directly from video player
          const videoPlayer = document.querySelector('video');
          let preciseCurrentTime = 0;

          if (videoPlayer && !isNaN(videoPlayer.currentTime)) {
            preciseCurrentTime = videoPlayer.currentTime;
            console.log(`Extracted PRECISE timestamp from video player: ${preciseCurrentTime}s`);
          } else {
            console.warn('Video player not found or invalid currentTime, using fallback');
            preciseCurrentTime = this.currentPlaybackTime;
          }

          // Update our internal tracking to match the precise time
          this.currentPlaybackTime = preciseCurrentTime;

          // Send back to sidebar with precise timestamp
          this.postMessageToSidebar({
            action: 'currentTimestampResponse',
            data: {
              currentTime: preciseCurrentTime,
              question: data.question,
              videoId: data.videoId,
              videoTitle: data.videoTitle
            }
          });
          break;

        case 'getPreciseTimestampAndProcess':
          // NEW: Get precise timestamp and immediately send back to sidebar for processing
          const videoEl = document.querySelector('video');
          let exactCurrentTime = 0;

          if (videoEl && !isNaN(videoEl.currentTime)) {
            exactCurrentTime = videoEl.currentTime;
            console.log(`EXACT timestamp captured at question time: ${exactCurrentTime}s`);
          } else {
            console.warn('Video player not found, using fallback timestamp');
            exactCurrentTime = this.currentPlaybackTime;
          }

          // Update our internal tracking
          this.currentPlaybackTime = exactCurrentTime;

          // Send precise timestamp back to sidebar for immediate processing
          this.postMessageToSidebar({
            action: 'preciseTimestampReceived',
            data: {
              currentTime: exactCurrentTime,
              question: data.question,
              videoId: data.videoId,
              videoTitle: data.videoTitle
            }
          });
          break;

        case 'processQuestion':
          this.processQuestion(data);
          break;

        case 'apiKeyFound':
          // Update OpenAIClient if sidebar found a key
          if (data.apiKey && window.OpenAIClient) {
            window.OpenAIClient.apiKey = data.apiKey;
            window.OpenAIClient.isConfigured = true;
            window.openai_api_key = data.apiKey;
            console.log("Updated API key from sidebar discovery");
          }
          break;
      }
    });

    // Close button
    const closeButton = document.getElementById('yt-sidebar-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hideSidebar();
      });
    }

    // Minimize button
    const minimizeButton = document.getElementById('yt-sidebar-minimize');
    if (minimizeButton) {
      minimizeButton.addEventListener('click', () => {
        this.toggleMinimize();
      });
    }

    // Tab switching
    const chatTab = document.getElementById('chat-tab');
    const transcriptTab = document.getElementById('transcript-tab');
    const chatSection = document.getElementById('chat-section');
    const transcriptSection = document.getElementById('transcript-section');

    if (chatTab && transcriptTab) {
      chatTab.addEventListener('click', () => {
        chatTab.classList.add('active');
        transcriptTab.classList.remove('active');
        chatSection.classList.add('active');
        transcriptSection.classList.remove('active');
      });

      transcriptTab.addEventListener('click', () => {
        chatTab.classList.remove('active');
        transcriptTab.classList.add('active');
        chatSection.classList.remove('active');
        transcriptSection.classList.add('active');
      });
    }

    // API key handling
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const changeApiKeyBtn = document.getElementById('change-api-key');

    if (saveApiKeyBtn && apiKeyInput) {
      saveApiKeyBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
          this.saveApiKey(apiKey);
          apiKeyInput.value = ''; // Clear for security
        }
      });
    }

    if (changeApiKeyBtn) {
      changeApiKeyBtn.addEventListener('click', () => {
        document.getElementById('api-key-missing').style.display = 'block';
        document.getElementById('api-key-configured').style.display = 'none';
      });
    }

    // Question input handling
    const questionInput = document.getElementById('question-input');
    const sendQuestionBtn = document.getElementById('send-question');

    if (questionInput && sendQuestionBtn) {
      questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (questionInput.value.trim() !== '' && !questionInput.disabled) {
            this.handleQuestion(questionInput.value.trim());
            questionInput.value = '';
          }
        }
      });

      sendQuestionBtn.addEventListener('click', () => {
        if (questionInput.value.trim() !== '' && !questionInput.disabled) {
          this.handleQuestion(questionInput.value.trim());
          questionInput.value = '';
        }
      });
    }
  },

  // Handle question submission
  handleQuestion: function(question) {
    if (!question) return;

    // Add user message to chat
    this.addChatMessage('user', question);

    // Add loading indicator
    this.addLoadingMessage();

    // Create a default response in case the transcript is empty
    let fallbackResponse = "";

    // First, check if we have a transcript at all
    if (!this.transcript || this.transcript.length === 0) {
      console.warn("No transcript available when processing question:", question);

      if (question.toLowerCase().includes("what did he just say") || 
          question.toLowerCase().includes("what was just said")) {
        fallbackResponse = "I'm sorry, but I couldn't access the transcript for this video. " +
          "Without the transcript, I can't tell you what was just said. " +
          "You may want to try enabling captions in the YouTube player instead.";
      } else {
        fallbackResponse = "I'm sorry, but I couldn't access the transcript for this video. " +
          "Without the transcript, I can't answer questions about the video content.";
      }

      // Display fallback response directly if no API key or empty transcript
      this.removeLoadingMessage();
      this.addChatMessage('assistant', fallbackResponse);
      return;
    }

    // Get relevant transcript section
    let relevantTranscript = '';

    // Check for "just said" type questions
    const justSaidPattern = /what (did|was) (he|she|they|it|the speaker|the narrator|the person|the presenter|the host) (just|recently) (say|said|talking about|referring to|mean|meant|mentioned)/i;

    // Check for identity/general questions about the video that might be in the title/description or beginning
    const identityPattern = /who is|who are|who was|what is this (video|about)|what is the (topic|subject|name|title)/i;

    // Check for specific subject questions
    const subjectPattern = /(who|what) (is|are|was|were) (the|this|these|that|those) ([a-z]+)/i;

    try {
      // ALWAYS get precise current timestamp directly from video player
      const videoPlayer = document.querySelector('video');
      let preciseCurrentTime = 0;

      if (videoPlayer && !isNaN(videoPlayer.currentTime)) {
        preciseCurrentTime = videoPlayer.currentTime;
        console.log(`Using PRECISE timestamp from video player: ${preciseCurrentTime}s`);
      } else {
        console.warn('Video player not found or invalid currentTime, using fallback');
        preciseCurrentTime = this.currentPlaybackTime;
      }

      // Update our internal tracking to match the precise time
      this.currentPlaybackTime = preciseCurrentTime;

      if (justSaidPattern.test(question)) {
        // Get 30 seconds of context before current time
        const contextStart = Math.max(0, preciseCurrentTime - 30);

        // Find segments in the 30-second window
        const contextSegments = [];
        for (let i = 0; i < this.transcript.length; i++) {
          const segment = this.transcript[i];
          if (segment && segment.start >= contextStart && 
              (segment.end <= preciseCurrentTime || 
               (segment.start <= preciseCurrentTime && (!segment.end || segment.end >= preciseCurrentTime)))) {
            contextSegments.push(segment);
          }
        }

        // If we found context, format it
        if (contextSegments.length > 0) {
          relevantTranscript = contextSegments.map(segment => 
            `[${this.formatTime(segment.start)}] ${segment.text}`
          ).join('\n');

          console.log("Found context segments for 'just said' question:", contextSegments.length);
        }
      }

      // Check for identity or subject questions that might need info from video title or beginning
      if (!relevantTranscript && (identityPattern.test(question) || subjectPattern.test(question))) {
        console.log("Detected identity or subject question, providing broader context");

        // For these questions, include:
        // 1. Video title and description
        // 2. First ~30 seconds of the video transcript
        // 3. Current position context

        let beginningSegments = [];
        let currentContextSegments = [];

        // Get beginning segments (first 30-60 seconds)
        if (this.transcript.length > 0) {
          for (let i = 0; i < this.transcript.length && i < 15; i++) {
            beginningSegments.push(this.transcript[i]);
          }
        }

        // Also get current context
        // Find current segment index (using precise timestamp)
        let currentSegmentIndex = 0;
        let foundSegment = false;

        for (let i = 0; i < this.transcript.length; i++) {
          if (this.transcript[i] && 
              this.transcript[i].start <= preciseCurrentTime && 
              (this.transcript[i].end >= preciseCurrentTime || i === this.transcript.length - 1)) {
            currentSegmentIndex = i;
            foundSegment = true;
            break;
          }
        }

        // Get 5 segments around current position
        if (foundSegment) {
          const windowStart = Math.max(0, currentSegmentIndex - 2);
          const windowEnd = Math.min(this.transcript.length - 1, currentSegmentIndex + 2);
          currentContextSegments = this.transcript.slice(windowStart, windowEnd + 1);
        }

        // Combine all context
        let fullContext = `VIDEO TITLE: ${this.videoTitle}\n\n`;

        // Add beginning segments
        if (beginningSegments.length > 0) {
          fullContext += "BEGINNING OF VIDEO:\n";
          fullContext += beginningSegments.map(segment => 
            `[${this.formatTime(segment?.start || 0)}] ${segment?.text || "[No text]"}`
          ).join('\n');
          fullContext += '\n\n';
        }

        // Add current context
        if (currentContextSegments.length > 0) {
          fullContext += "CURRENT POSITION:\n";
          fullContext += currentContextSegments.map(segment => 
            `[${this.formatTime(segment?.start || 0)}] ${segment?.text || "[No text]"}`
          ).join('\n');
        }

        relevantTranscript = fullContext;
        console.log("Using expanded identity-question context");
      }

      // If we still couldn't get a narrow context, use a wider one around current position
      if (!relevantTranscript) {
        // Find current segment index (using precise timestamp)
        let currentSegmentIndex = 0;
        let foundSegment = false;

        for (let i = 0; i < this.transcript.length; i++) {
          if (this.transcript[i] && 
              this.transcript[i].start <= preciseCurrentTime && 
              (this.transcript[i].end >= preciseCurrentTime || i === this.transcript.length - 1)) {
            currentSegmentIndex = i;
            foundSegment = true;
            break;
          }
        }

        // If we couldn't find a matching segment, just use the middle of the transcript
        if (!foundSegment && this.transcript.length > 0) {
          currentSegmentIndex = Math.floor(this.transcript.length / 2);
        }

        // Get a larger window of segments (current + 8 before and after) for better context
        const windowStart = Math.max(0, currentSegmentIndex - 8);
        const windowEnd = Math.min(this.transcript.length - 1, currentSegmentIndex + 8);

        const contextSegments = this.transcript.slice(windowStart, windowEnd + 1);

        if (contextSegments.length > 0) {
          relevantTranscript = contextSegments.map(segment => 
            `[${this.formatTime(segment?.start || 0)}] ${segment?.text || "[No text]"}`
          ).join('\n');

          console.log("Using wider context with segments:", contextSegments.length);
        }
      }

      // If we still don't have a transcript, use a placeholder
      if (!relevantTranscript) {
        relevantTranscript = "No transcript available for this part of the video.";
        console.warn("No relevant transcript found for playback time:", this.currentPlaybackTime);
      }

      // Process question with OpenAI using the precise timestamp captured at the beginning
      this.processQuestion({
        question: question,
        transcript: relevantTranscript,
        videoId: this.videoId,
        videoTitle: this.videoTitle,
        currentTime: preciseCurrentTime  // Use the timestamp captured at the very beginning
      });

    } catch (error) {
      console.error("Error processing question context:", error);
      this.removeLoadingMessage();
      this.addChatMessage('system', `Error getting context: ${error.message}`);
    }
  },

  // Format time in seconds to MM:SS format
  formatTime: function(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  },

  // Add user or assistant message to chat
  addChatMessage: function(role, content) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageEl = document.createElement('div');
    messageEl.className = `yt-chat-message ${role}`;

    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.textContent = content;

    messageEl.appendChild(contentEl);
    chatMessages.appendChild(messageEl);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  },

  // Clear all chat messages
  clearChatMessages: function() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    // Keep only the initial welcome message
    const welcomeMessage = chatMessages.querySelector('.yt-chat-message.system:first-child');
    chatMessages.innerHTML = '';

    if (welcomeMessage) {
      chatMessages.appendChild(welcomeMessage);
    }
  },

  // Add loading message
  addLoadingMessage: function() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

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
  },

  // Remove loading message
  removeLoadingMessage: function() {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
      loadingMessage.remove();
    }
  },

  // Check if OpenAI API key is configured
  checkApiKeyStatus: async function() {
    try {
      console.log("Checking API key status...");

      // Get API key from storage
      const data = await new Promise((resolve) => {
        chrome.storage.sync.get('openai_api_key', (result) => {
          resolve(result);
        });
      });

      // Log key details (without exposing the full key)
      if (data && data.openai_api_key) {
        const key = data.openai_api_key;
        console.log(`Found API key in storage: ${key.substring(0, 5)}...${key.substring(key.length - 4)} (${key.length} chars)`);

        // Store the key globally for OpenAI client access
        // This is crucial as sometimes the OpenAI client doesn't load the key properly
        window.openai_api_key = key;
      } else {
        console.log("No API key found in storage");
      }

      const isConfigured = !!(data && data.openai_api_key);

      // Update UI based on API key status
      const apiKeyMissing = document.getElementById('api-key-missing');
      const apiKeyConfigured = document.getElementById('api-key-configured');
      const questionInput = document.getElementById('question-input');
      const sendQuestionBtn = document.getElementById('send-question');

      if (isConfigured) {
        console.log("API key is configured, updating UI...");
        if (apiKeyMissing) apiKeyMissing.style.display = 'none';
        if (apiKeyConfigured) apiKeyConfigured.style.display = 'flex';
        if (questionInput) questionInput.disabled = false;
        if (sendQuestionBtn) sendQuestionBtn.disabled = false;

        // Force update the OpenAI client's key
        if (window.OpenAIClient) {
          window.OpenAIClient.apiKey = data.openai_api_key;
          window.OpenAIClient.isConfigured = true;
          console.log("Updated OpenAIClient with API key");
        }
      } else {
        console.log("API key is not configured, updating UI...");
        if (apiKeyMissing) apiKeyMissing.style.display = 'block';
        if (apiKeyConfigured) apiKeyConfigured.style.display = 'none';
        if (questionInput) questionInput.disabled = true;
        if (sendQuestionBtn) sendQuestionBtn.disabled = true;
      }

      // Also notify the sidebar about the API key status
      this.postMessageToSidebar({
        action: 'apiKeyStatus',
        data: { configured: isConfigured }
      });

      return isConfigured;
    } catch (error) {
      console.error('Error checking API key status:', error);
      console.error('Error stack:', error.stack);
      return false;
    }
  },

  // Save OpenAI API key
  saveApiKey: async function(apiKey) {
    if (!apiKey) {
      console.error("Attempted to save empty API key");
      return false;
    }

    try {
      console.log(`Saving API key from content.js (starts with ${apiKey.substring(0, 5)}...)`);

      // Save API key to storage
      await new Promise((resolve, reject) => {
        chrome.storage.sync.set({ 'openai_api_key': apiKey }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });

      console.log("API key saved to Chrome storage");

      // Store in global variable for emergency backup access
      window.openai_api_key = apiKey;

      // Update OpenAIClient directly
      if (window.OpenAIClient) {
        window.OpenAIClient.apiKey = apiKey;
        window.OpenAIClient.isConfigured = true;
        console.log("Updated OpenAIClient instance with new API key");
      } else {
        console.error("OpenAIClient not found on window object!");
      }

      // Check if API key is valid by making a test request
      console.log("Testing API key validity...");
      const isValid = await this.testApiKey(apiKey);

      if (isValid) {
        console.log("API key validated successfully");
      } else {
        console.warn("API key validation failed, but proceeding anyway");
      }

      // Update UI
      await this.checkApiKeyStatus();

      // Notify sidebar of successful API key save
      this.postMessageToSidebar({
        action: 'apiKeyStatus',
        data: { configured: true, message: "API key saved successfully" }
      });

      return true;
    } catch (error) {
      console.error('Error saving API key:', error);
      console.error('Error stack:', error.stack);

      // Display error in UI
      const apiKeyMissing = document.getElementById('api-key-missing');
      if (apiKeyMissing) {
        const errorEl = document.createElement('p');
        errorEl.style.color = 'red';
        errorEl.textContent = `Error: ${error.message}`;

        // Remove any previous error messages
        const previousError = apiKeyMissing.querySelector('p[style*="color: red"]');
        if (previousError) {
          previousError.remove();
        }

        apiKeyMissing.appendChild(errorEl);
      }

      // Notify sidebar of API key save failure
      this.postMessageToSidebar({
        action: 'apiKeyStatus',
        data: { configured: false, error: error.message }
      });

      return false;
    }
  },

  // Test if API key is valid
  testApiKey: async function(apiKey) {
    try {
      // Use plain object headers to avoid encoding issues
      const headers = {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      };

      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: headers
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing API key:', error);
      return false;
    }
  },

  // Show the sidebar
  showSidebar: function() {
    // Adjust main video container
    const ytdApp = document.querySelector('ytd-app');
    if (ytdApp) {
      ytdApp.classList.add('yt-sidebar-active');
    }

    this.sidebarContainer.classList.add('visible');
    this.sidebarVisible = true;
  },

  // Hide the sidebar
  hideSidebar: function() {
    // Reset main video container
    const ytdApp = document.querySelector('ytd-app');
    if (ytdApp) {
      ytdApp.classList.remove('yt-sidebar-active');
      ytdApp.classList.remove('yt-sidebar-minimized');
    }

    this.sidebarContainer.classList.remove('visible');
    this.sidebarContainer.classList.remove('minimized');
    this.sidebarVisible = false;
  },

  // Toggle sidebar visibility
  toggleSidebar: function() {
    if (this.sidebarVisible) {
      this.hideSidebar();
    } else {
      this.showSidebar();
    }
  },

  // Toggle sidebar minimize state
  toggleMinimize: function() {
    const ytdApp = document.querySelector('ytd-app');

    if (this.sidebarContainer.classList.contains('minimized')) {
      // Expand from minimized state
      this.sidebarContainer.classList.remove('minimized');
      if (ytdApp) {
        ytdApp.classList.remove('yt-sidebar-minimized');
        ytdApp.classList.add('yt-sidebar-active');
      }

      // Make minimize button show the minimize icon
      const minimizeButton = document.getElementById('yt-sidebar-minimize');
      if (minimizeButton) {
        minimizeButton.textContent = '−';
        minimizeButton.title = 'Minimize sidebar';
      }
    } else {
      // Minimize the sidebar
      this.sidebarContainer.classList.add('minimized');
      if (ytdApp) {
        ytdApp.classList.remove('yt-sidebar-active');
        ytdApp.classList.add('yt-sidebar-minimized');
      }

      // Make minimize button show the expand icon
      const minimizeButton = document.getElementById('yt-sidebar-minimize');
      if (minimizeButton) {
        minimizeButton.textContent = '+';
        minimizeButton.title = 'Expand sidebar';
      }
    }
  },

  // Update video info in the sidebar
  updateVideoInfo: function() {
    const titleElement = document.getElementById('current-video-title');
    if (titleElement) {
      titleElement.textContent = `Now playing: ${this.videoTitle}`;
    }
  },

  // Load transcript content
  loadTranscript: async function() {
    try {
      console.log(`Loading transcript for video ID: ${this.videoId}`);

      // Show loading indicator 
      const loadingEl = document.getElementById('yt-transcript-loading');
      if (loadingEl) loadingEl.style.display = 'flex';

      // CRITICAL - Reset transcript to empty array to start fresh
      this.transcript = [];

      // IMPORTANT - Notify sidebar immediately that we're loading a new transcript
      // This ensures the sidebar clears its transcript state before getting new data
      const sidebarFrame = document.getElementById('yt-ai-assistant-sidebar');
      if (sidebarFrame && sidebarFrame.contentWindow) {
        sidebarFrame.contentWindow.postMessage({
          source: 'yt-ai-assistant',
          action: 'resetTranscript',
          videoId: this.videoId,
          videoTitle: this.videoTitle
        }, '*');
        console.log("Sent resetTranscript message directly to sidebar iframe");
      }

      try {
        // Use a direct self-contained approach to fetch transcript
        // This will be more resilient and prevent method reference errors
        const videoId = this.videoId;

        // Try to get transcript from YouTube captions
        try {
          const url = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`;
          const response = await fetch(url);
          const text = await response.text();

          if (text && text.length > 50) { // Basic check if we got actual content
            const parser = new DOMParser();
            const transcriptXml = parser.parseFromString(text, "text/xml");
            const textElements = transcriptXml.getElementsByTagName("text");

            if (textElements && textElements.length > 0) {
              for (let i = 0; i < textElements.length; i++) {
                const text = textElements[i];
                const start = parseFloat(text.getAttribute("start"));
                const duration = parseFloat(text.getAttribute("dur") || "0");

                const textContent = text.textContent.trim()
                  .replace(/&nbsp;/g, ' ')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'");

                if (textContent.trim()) {
                  this.transcript.push({
                    start,
                    duration,
                    end: start + duration,
                    text: textContent
                  });
                }
              }
              console.log(`Transcript loaded successfully using direct method, segments: ${this.transcript.length}`);
            }
          }
        } catch (directError) {
          console.warn("Direct transcript fetch failed:", directError);
        }

        // If direct method failed, fall back to TranscriptFetcher but in an isolated way
        if (!this.transcript || this.transcript.length === 0) {
          try {
            const fallbackTranscript = await TranscriptFetcher.fetchTranscript(this.videoId);
            if (fallbackTranscript && fallbackTranscript.length > 0) {
              this.transcript = fallbackTranscript;
              console.log(`Transcript loaded using fallback, segments: ${this.transcript.length}`);
            }
          } catch (fallbackError) {
            console.warn("Fallback transcript fetch failed:", fallbackError);
          }
        }
      } catch (transcriptError) {
        console.error("All transcript fetch methods failed:", transcriptError);
      }

      // Hide loading indicator
      if (loadingEl) loadingEl.style.display = 'none';

      // Get the transcript content element
      const contentEl = document.getElementById('yt-transcript-content');

      if (this.transcript && this.transcript.length > 0) {
        console.log(`Transcript loaded for video "${this.videoTitle}", segments:`, this.transcript.length);

        // Format and display the transcript
        if (contentEl) {
          let html = '<div class="yt-transcript-segments">';

          for (const segment of this.transcript) {
            const formattedTime = this.formatTime(segment.start);

            html += `
              <div class="yt-transcript-segment" data-start="${segment.start}" data-end="${segment.end || segment.start + 5}" data-index="${this.transcript.indexOf(segment)}">
                <span class="yt-transcript-time">${formattedTime}</span>
                <span class="yt-transcript-text">${segment.text}</span>
              </div>
            `;
          }

          html += '</div>';
          contentEl.innerHTML = html;

          // Add click events to transcript segments
          const segments = document.querySelectorAll('.yt-transcript-segment');
          segments.forEach(segment => {
            segment.addEventListener('click', () => {
              const startTime = parseFloat(segment.getAttribute('data-start'));
              this.seekVideoToTime(startTime);
            });
          });

          console.log("Transcript displayed successfully in sidebar");
        }

        // CRITICAL: Directly send transcript to sidebar iframe to ensure delivery
        const sidebarFrame = document.getElementById('yt-ai-assistant-sidebar');
        if (sidebarFrame && sidebarFrame.contentWindow) {
          console.log(`Sending transcript directly to sidebar: ${this.transcript.length} segments`);
          sidebarFrame.contentWindow.postMessage({
            source: 'yt-ai-assistant',
            action: 'transcriptUpdated',
            data: {
              videoId: this.videoId,
              videoTitle: this.videoTitle,
              transcript: this.transcript
            }
          }, '*');
        } else {
          console.error("Cannot find sidebar iframe to send transcript");
        }

        // Also use the regular method as a backup
        try {
          if (typeof this.postMessageToSidebar === 'function') {
            this.postMessageToSidebar({
              action: 'transcriptUpdated',
              data: {
                videoId: this.videoId,
                videoTitle: this.videoTitle,
                transcript: this.transcript
              }
            });
          }
        } catch (postErr) {
          console.warn("Error with postMessageToSidebar method:", postErr);
        }

        // Send message to background script
        try {
          chrome.runtime.sendMessage({
            action: 'transcriptFetched',
            videoId: this.videoId,
            method: 'direct_content_script'
          });
        } catch (msgErr) {
          console.log('Error sending message to background script:', msgErr);
        }
      } else {
        if (contentEl) {
          contentEl.innerHTML = '<div class="yt-transcript-error">No transcript available for this video.</div>';
        }
        console.warn("No transcript available for video:", this.videoId);

        // Clear the transcript in the sidebar as well - use direct iframe communication
        const sidebarFrame = document.getElementById('yt-ai-assistant-sidebar');
        if (sidebarFrame && sidebarFrame.contentWindow) {
          sidebarFrame.contentWindow.postMessage({
            source: 'yt-ai-assistant',
            action: 'transcriptUpdated',
            data: {
              videoId: this.videoId,
              videoTitle: this.videoTitle,
              transcript: []
            }
          }, '*');
        }

        // Also use regular method as backup
        try {
          if (typeof this.postMessageToSidebar === 'function') {
            this.postMessageToSidebar({
              action: 'transcriptUpdated',
              data: {
                videoId: this.videoId,
                videoTitle: this.videoTitle,
                transcript: []
              }
            });
          }
        } catch (postErr) {
          console.warn("Error with postMessageToSidebar method:", postErr);
        }
      }
    } catch (error) {
      // Hide loading
      const loadingEl = document.getElementById('yt-transcript-loading');
      if (loadingEl) loadingEl.style.display = 'none';

      // Show error
      const contentEl = document.getElementById('yt-transcript-content');
      if (contentEl) {
        contentEl.innerHTML = `<div class="yt-transcript-error">Error loading transcript: ${error.message}</div>`;
      }

      console.error("YouTube AI Assistant Error:", error);

      // Also add a transcript placeholder so we can still use the AI features
      this.transcript = [];

      // Notify sidebar about the transcript error
      if (typeof this.postMessageToSidebar === 'function') {
        this.postMessageToSidebar({
          action: 'transcriptUpdated',
          data: {
            videoId: this.videoId,
            videoTitle: this.videoTitle,
            transcript: [],
            error: error.message
          }
        });
      }

      // Send error message to background script
      try {
        chrome.runtime.sendMessage({
          action: 'transcriptError',
          videoId: this.videoId,
          error: error.message
        });
      } catch (err) {
        console.log('Error sending message to background script:', err);
      }
    }
  },

  // Start tracking video playback time
  startPlaybackTracking: function() {
    // Clear any existing tracker
    if (this.playbackTracker) {
      clearInterval(this.playbackTracker);
    }

    this.playbackTracker = setInterval(() => {
      const videoPlayer = document.querySelector('video');
      if (videoPlayer) {
        const currentTime = videoPlayer.currentTime;

        // Only update if the time has changed significantly
        if (Math.abs(currentTime - this.currentPlaybackTime) > 0.5) {
          this.currentPlaybackTime = currentTime;

          // Send current playback time to sidebar
          this.postMessageToSidebar({
            action: 'updatePlaybackTime',
            data: { time: currentTime }
          });
        }
      }
    }, 1000); // Check every second
  },

  // Stop playback tracking
  stopPlaybackTracking: function() {
    if (this.playbackTracker) {
      clearInterval(this.playbackTracker);
      this.playbackTracker = null;
    }
  },

  // Process question with OpenAI
  processQuestion: async function(data) {
    try {
      console.log("Processing question...", data);

      // CRITICAL FIX: Verify and update video information to prevent mismatched data
      if (data.videoId && data.videoId !== this.videoId) {
        console.warn(`Video ID mismatch: sidebar sending ${data.videoId}, content script has ${this.videoId}`);
        // Force update from the current video in content script
        data.videoId = this.videoId;
        data.videoTitle = this.videoTitle;

        // Update transcript with current video data
        if (!data.transcript || data.transcript.includes("No transcript available")) {
          // If the transcript is missing, check if we have one locally
          if (this.transcript && this.transcript.length > 0) {
            console.log("Using content script's transcript instead of sidebar's");
            // Format the transcript for AI
            data.transcript = this.transcript.map(segment => 
              `[${this.formatTime(segment.start)}] ${segment.text}`
            ).join('\n');
          }
        }

        // Make sure the transcript includes the video title for context
        if (data.transcript && !data.transcript.includes("VIDEO TITLE:")) {
          data.transcript = `VIDEO TITLE: ${this.videoTitle}\n\n${data.transcript}`;
        }
      }

      // Check if OpenAI client is already initialized
      if (!window.OpenAIClient.isConfigured) {
        console.log("OpenAIClient not configured, initializing...");
        await window.OpenAIClient.init();
      }

      // Double-check and use global API key if needed
      if (!window.OpenAIClient.isConfigured || !window.OpenAIClient.apiKey) {
        console.log("OpenAIClient still not configured, checking global key...");

        if (window.openai_api_key) {
          console.log("Using global API key from window.openai_api_key");
          window.OpenAIClient.apiKey = window.openai_api_key;
          window.OpenAIClient.isConfigured = true;
        } else {
          // Try fetching the key directly
          const apiKeyData = await new Promise((resolve) => {
            chrome.storage.sync.get('openai_api_key', (result) => {
              resolve(result);
            });
          });

          if (apiKeyData && apiKeyData.openai_api_key) {
            console.log("Directly fetched API key from storage");
            window.OpenAIClient.apiKey = apiKeyData.openai_api_key;
            window.OpenAIClient.isConfigured = true;
          } else {
            throw new Error('OpenAI API key not configured');
          }
        }
      }

      console.log("Processing question using OpenAI client...");

      // Check if question is one we can handle directly without API
      const justSaidPattern = /what (did|was) (he|she|they|it|the speaker|the narrator|the person|the presenter|the host) (just|recently) (say|said|talking about|referring to|mean|meant|mentioned)/i;

      // Special case: Handle "what did they just say" questions directly from transcript
      // without using the API at all, to avoid rate limits completely
      if (justSaidPattern.test(data.question)) {
        console.log("Detected 'what did they just say' type question - handling directly from transcript");

        // Extract the most recent transcript content (last ~30 seconds)
        const contextStart = Math.max(0, this.currentPlaybackTime - 30);
        let recentText = '';

        // Special handling if we have direct transcript data
        if (data.transcript && data.transcript.length > 10) {
          // Format the transcript nicely
          const lines = data.transcript.split('\n');
          let recentSegments = [];

          for (const line of lines) {
            // Extract timestamp if available (usually in [MM:SS] format)
            const timeMatch = line.match(/\[(\d+:\d+)\]/);
            if (timeMatch) {
              const timeStr = timeMatch[1];
              const parts = timeStr.split(':');
              const seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);

              // Only include recent transcript
              if (seconds >= contextStart && seconds <= this.currentPlaybackTime) {
                // Remove timestamp and add to recent text
                const text = line.replace(/\[\d+:\d+\]/, '').trim();
                recentText += text + ' ';
                recentSegments.push(line);
              }
            } else if (line.trim().length > 0) {
              // If no timestamp but has content, include it as fallback
              recentText += line.trim() + ' ';
              recentSegments.push(line);
            }
          }

          // If we didn't find enough context by timestamp, just use the last few segments
          if (recentText.length < 30 && lines.length > 0) {
            const lastFewSegments = lines.slice(-5);
            recentText = lastFewSegments.join(' ').replace(/\[\d+:\d+\]/g, '').trim();
            recentSegments = lastFewSegments;
          }

          // Trim and format the response
          recentText = recentText.trim();

          // If we have recent text, use it as the response
          if (recentText.length > 5) {
            this.removeLoadingMessage();

            const response = `Based on the transcript, this is what was just said:\n\n"${recentText}"`;

            this.addChatMessage('assistant', response);
            return;
          } else if (recentSegments.length > 0) {
            // Just use whatever segments we found
            this.removeLoadingMessage();
            const segmentText = recentSegments.join('\n').replace(/\[\d+:\d+\]/g, '').trim();
            const response = `Based on the available transcript:\n\n"${segmentText}"`;
            this.addChatMessage('assistant', response);
            return;
          } else {
            // No recent segments found, so return general message
            this.removeLoadingMessage();
            this.addChatMessage('assistant', 'I couldn\'t find the exact recent transcript around the current playback time. You can check the Transcript tab to see what was said throughout the video.');
            return;
          }
        } else {
          // No transcript available
          this.removeLoadingMessage();
          this.addChatMessage('assistant', 'I couldn\'t access the transcript to tell you what was just said. You might want to try enabling captions in the YouTube player.');
          return;
        }
      }

      // If we reach here, either it's not a "what did they just say" question
      // or our fallback didn't work, so try the OpenAI API

      // Define a simpler, universal transcript fallback
      const provideDirectTranscriptResponse = () => {
        // For any question, we can at least show relevant parts of the transcript
        // This is a fallback for when the API fails
        console.log("Using universal transcript fallback for this question");

        // Let's extract a larger window of transcript for context (1 minute around current time)
        const contextStart = Math.max(0, this.currentPlaybackTime - 30);
        const contextEnd = this.currentPlaybackTime + 30;
        let relevantSegments = [];

        // Format the transcript nicely
        if (data.transcript && data.transcript.length > 0) {
          const lines = data.transcript.split('\n');

          for (const line of lines) {
            // Extract timestamp if available
            const timeMatch = line.match(/\[(\d+:\d+)\]/);
            if (timeMatch) {
              const timeStr = timeMatch[1];
              const parts = timeStr.split(':');
              const seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);

              // Include transcript in the window
              if (seconds >= contextStart && seconds <= contextEnd) {
                relevantSegments.push(line);
              }
            } else if (line.trim().length > 0) {
              // Include lines without timestamps as fallback
              relevantSegments.push(line);
            }
          }

          // If we found nothing specific, just use a section of transcript
          if (relevantSegments.length === 0 && lines.length > 0) {
            // Use a section from middle of transcript
            const middleIndex = Math.floor(lines.length / 2);
            const startIndex = Math.max(0, middleIndex - 5);
            const endIndex = Math.min(lines.length, middleIndex + 5);
            relevantSegments = lines.slice(startIndex, endIndex);
          }

          // If we have segments, create a response
          if (relevantSegments.length > 0) {
            this.removeLoadingMessage();

            const segments = relevantSegments.join('\n');
            const response = `I can't use the AI to answer that specific question right now due to API rate limits, but here's the relevant part of the transcript that might help:\n\n${segments}\n\nYou can also check the Transcript tab for the full transcript.`;

            this.addChatMessage('assistant', response);
            return true;
          }
        }

        return false;
      };

      // Try using the OpenAI API with fallback
      try {
        console.log("About to call OpenAIClient.processQuestion, checking state...");
        console.log(`API Key configured: ${window.OpenAIClient.isConfigured}, Key starts with: ${window.OpenAIClient.apiKey ? window.OpenAIClient.apiKey.substring(0, 5) : 'none'}`);

        // Double-check the client is properly configured before calling
        if (!window.OpenAIClient.isConfigured || !window.OpenAIClient.apiKey) {
          throw new Error('OpenAI API key still not properly configured');
        }

        // Always use the content script's current video ID to ensure accuracy
        const result = await window.OpenAIClient.processQuestion(
          data.question,
          data.transcript || "No transcript data available",
          data.videoTitle || this.videoTitle,
          data.currentTime || this.currentPlaybackTime,
          this.videoId // Explicitly pass current video ID from content script
        );

        // Remove loading indicator
        this.removeLoadingMessage();

        // Add assistant response to chat
        if (result && result.answer) {
          this.addChatMessage('assistant', result.answer);

          // Log token usage for debugging
          if (result.tokens) {
            console.log(`Token usage - Prompt: ${result.tokens.prompt}, Completion: ${result.tokens.completion}, Total: ${result.tokens.total}`);
          }

          // Note if a different model was used
          if (result.model && result.model !== 'gpt-4o') {
            console.log(`Note: Used ${result.model} instead of gpt-4o`);
          }
        } else {
          throw new Error('No response generated from OpenAI');
        }
      } catch (apiError) {
        console.error("OpenAI API error, using fallback:", apiError);

        // For rate limit errors, try using direct transcript
        if (apiError.message.includes('rate limit') || apiError.message.includes('429')) {
          const fallbackSuccess = provideDirectTranscriptResponse();

          if (!fallbackSuccess) {
            this.removeLoadingMessage();
            this.addChatMessage('assistant', "I'm sorry, but I've reached the API rate limit and can't answer your question right now. Please try again later or check the Transcript tab to read the content directly.");
          }
        } else {
          // For other errors, pass them through
          throw apiError;
        }
      }

    } catch (error) {
      console.error('Error processing question:', error);

      // Remove loading indicator
      this.removeLoadingMessage();

      // Format error message for display
      let errorMessage = error.message;
      let errorResponse = null;

      // Special handling for rate limits - suggest retry after delay
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        // Check if the transcript is available for direct answer
        if (data.transcript && data.transcript.length > 10) {
          // Provide direct transcript without using API
          const truncatedTranscript = data.transcript.split('\n').slice(0, 5).join('\n') + '...';
          errorResponse = `I can't process your question right now due to API rate limits, but here's part of the transcript for this section:\n\n${truncatedTranscript}\n\nYou can try again in a few minutes or use the transcript tab to read directly.`;
        } else {
          errorMessage = 'OpenAI API rate limit exceeded. Please try again in a few minutes or use the transcript tab to read directly.';
        }
      } else if (error.message.includes('invalid api key')) {
        errorMessage = 'Your API key appears to be invalid. Please update your OpenAI API key in the settings.';
      } else if (error.message.includes('insufficient_quota')) {
        errorMessage = 'Your OpenAI account has insufficient quota. Please check your billing details on openai.com.';
      }

      // Add error message to chat
      if (errorResponse) {
        this.addChatMessage('assistant', errorResponse);
      } else {
        this.addChatMessage('system', `Error: ${errorMessage}`);
      }
    }
  },

  // Seek YouTube video to specific time
  seekVideoToTime: function(seconds) {
    const videoPlayer = document.querySelector('video');
    if (videoPlayer) {
      videoPlayer.currentTime = seconds;
    }
  },

  // Send message to sidebar iframe
  postMessageToSidebar: function(message) {
    const sidebarFrame = document.getElementById('yt-ai-assistant-sidebar');
    if (sidebarFrame && sidebarFrame.contentWindow) {
      sidebarFrame.contentWindow.postMessage({
        source: 'yt-ai-assistant',
        ...message
      }, '*');
    }
  },

  // Add event listeners for page navigation
  addEventListeners: function() {
    // Monitor for YouTube SPA navigation using multiple detection methods
    this.setupTitleObserver();
    this.setupUrlChangeListener();
    this.setupVideoPlayerObserver();
  },

  // Monitor title changes (one way to detect video changes)
  setupTitleObserver: function() {
    const titleObserver = new MutationObserver((mutations) => {
      if (document.location.pathname === '/watch') {
        const currentVideoId = new URLSearchParams(window.location.search).get('v');
        if (currentVideoId && currentVideoId !== this.videoId) {
          this.handleVideoChange(currentVideoId);
        }
      }
    });

    // Observe title changes
    const titleElement = document.querySelector('title');
    if (titleElement) {
      titleObserver.observe(titleElement, {
        subtree: true,
        characterData: true,
        childList: true
      });
    }
  },

  // Monitor URL changes (more reliable way to detect video changes)
  setupUrlChangeListener: function() {
    // Create a history state change listener
    window.addEventListener('popstate', () => {
      this.checkForVideoChange();
    });

    // Also intercept pushState and replaceState
    const originalPushState = history.pushState;
    history.pushState = function() {
      originalPushState.apply(this, arguments);
      window.dispatchEvent(new Event('locationchange'));
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function() {
      originalReplaceState.apply(this, arguments);
      window.dispatchEvent(new Event('locationchange'));
    };

    window.addEventListener('locationchange', () => {
      this.checkForVideoChange();
    });

    // Check every 2 seconds as a fallback - YouTube can load videos without URL changes sometimes
    setInterval(() => {
      this.checkForVideoChange();
    }, 2000);
  },

  // Monitor video player changes
  setupVideoPlayerObserver: function() {
    const videoPlayerObserver = new MutationObserver(() => {
      this.checkForVideoChange();
    });

    // Try to observe the video container
    const videoContainer = document.querySelector('#movie_player') || document.querySelector('.html5-video-container');
    if (videoContainer) {
      videoPlayerObserver.observe(videoContainer, {
        subtree: true,
        childList: true,
        attributes: true
      });
    }
  },

  // Check if the video has changed by comparing IDs
  checkForVideoChange: function() {
    if (document.location.pathname === '/watch') {
      const currentVideoId = new URLSearchParams(window.location.search).get('v');
      if (currentVideoId && currentVideoId !== this.videoId) {
        console.log(`Video change detected: ${this.videoId || 'none'} -> ${currentVideoId}`);

        // First update this.videoId immediately to ensure any subsequent operations use the correct ID
        const oldVideoId = this.videoId;
        this.videoId = currentVideoId;

        // FORCE CRITICAL RESET: Completely destroy and recreate sidebar to ensure fresh state
        try {
          // First remove any existing iframe
          const sidebarFrame = document.getElementById('yt-ai-assistant-sidebar');
          if (sidebarFrame) {
            sidebarFrame.remove();
            console.log("Removed sidebar iframe to force full reset");
          }

          // Also remove any existing container
          const sidebarContainer = document.getElementById('yt-ai-assistant-container');
          if (sidebarContainer) {
            sidebarContainer.remove();
            console.log("Removed sidebar container for complete reset");
          }

          // Wait a moment before recreating everything from scratch
          setTimeout(() => {
            // First create a new sidebar container and iframe
            this.createSidebar();
            console.log("Recreated sidebar with fresh iframe");

            // Extract the new video title immediately
            this.extractVideoInfo();
            console.log(`Updated video info: ID=${this.videoId}, Title="${this.videoTitle}"`);

            // Update the video title in the UI right away
            const titleElement = document.getElementById('current-video-title');
            if (titleElement) {
              titleElement.textContent = this.videoTitle || 'Unknown video';
            }

            // Reset transcript state and reload it
            this.transcript = [];
            this.loadTranscript();

            // Restart tracking with the new video
            this.startPlaybackTracking();

            console.log("Video change handling complete");
          }, 200);
        } catch (error) {
          console.error("Error during video change reset:", error);
          // Fallback to simpler handling if the aggressive reset fails
          this.handleVideoChange(currentVideoId);
        }
      }
    }
  },

  // Handle a video change with proper cleanup and initialization
  handleVideoChange: function(newVideoId) {
    console.log(`Handling video change to: ${newVideoId}`);

    // Stop tracking the old video
    this.stopPlaybackTracking();

    const oldVideoId = this.videoId;

    // Update video ID immediately
    this.videoId = newVideoId;

    // Get the new video info
    this.extractVideoInfo();
    console.log(`New video title: "${this.videoTitle}"`);

    // Update title in the actual sidebar container 
    const titleElement = document.getElementById('current-video-title');
    if (titleElement) {
      titleElement.textContent = this.videoTitle || 'YouTube Video';
    }

    // CRITICAL FIX: Destroy and recreate the iframe to force a clean state
    const oldIframe = document.getElementById('yt-ai-assistant-sidebar');
    if (oldIframe) {
      // Create a new iframe that will replace the old one
      const newIframe = document.createElement('iframe');
      newIframe.id = 'yt-ai-assistant-sidebar';
      newIframe.src = chrome.runtime.getURL(`sidebar.html?v=${newVideoId}&t=${Date.now()}`);
      newIframe.classList.add('yt-sidebar-iframe');

      // Replace the old iframe with the new one
      if (oldIframe.parentNode) {
        oldIframe.parentNode.replaceChild(newIframe, oldIframe);
      }

      console.log("Replaced sidebar iframe for clean state");

      // Wait for the new iframe to load before proceeding
      newIframe.onload = () => {
        console.log("New sidebar iframe loaded");

        // Reset all state related to the old video
        this.transcript = [];
        this.currentPlaybackTime = 0;

        // Clear chat messages in our view (iframe will start fresh)
        this.clearChatMessages();

        // Load transcript for the new video
        this.loadTranscript();

        // Start tracking new video
        this.startPlaybackTracking();
      };
    } else {
      // If there was no iframe to replace, just continue with normal reset
      console.warn("No sidebar iframe found to replace");

      // Reset all state
      this.transcript = [];
      this.clearChatMessages();
      this.currentPlaybackTime = 0;

      // Load transcript for the new video
      this.loadTranscript();

      // Start tracking new video
      this.startPlaybackTracking();
    }

    // Notify background script about the change
    try {
      chrome.runtime.sendMessage({
        action: 'videoChanged',
        oldVideoId: oldVideoId,
        newVideoId: newVideoId
      }).catch(err => console.log("Error sending message to background script:", err));
    } catch (e) {
      console.error("Error notifying background script:", e);
    }
  }
};

// Initialize when the page is fully loaded
window.addEventListener('load', () => {
  // Check if we're on a YouTube video page
  if (window.location.pathname === '/watch' && window.location.search.includes('v=')) {
    // Create a button in the YouTube player to toggle the sidebar
    const addAssistantButton = () => {
      const ytpRightControls = document.querySelector('.ytp-right-controls');

      if (ytpRightControls && !document.getElementById('yt-assistant-btn')) {
        const assistantButton = document.createElement('button');
        assistantButton.id = 'yt-assistant-btn';
        assistantButton.className = 'ytp-button yt-assistant-toggle-btn';
        assistantButton.title = 'AI Assistant';
        assistantButton.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 36 36"><path fill="white" d="M18,4C9.16,4,2,11.16,2,20c0,3.21,0.95,6.2,2.58,8.7C4.04,30.07,3,31.89,3,34h2c0-2.14,1.23-3.98,3.03-4.87 C10.92,31.51,14.32,33,18,33c8.84,0,16-7.16,16-16C34,11.16,26.84,4,18,4z M18,31c-3.23,0-6.17-1.3-8.32-3.4 c1.36-0.65,2.86-1.1,4.47-1.1c1.61,0,3.11,0.45,4.47,1.1C20.17,29.7,21.27,31,18,31z M18,6c7.73,0,14,6.27,14,14 c0,7.73-6.27,14-14,14c-7.73,0-14-6.27-14-14C4,12.27,10.27,6,18,6z M13,15c0-1.1,0.9-2,2-2s2,0.9,2,2s-0.9,2-2,2S13,16.1,13,15z M21,15c0-1.1,0.9-2,2-2s2,0.9,2,2s-0.9,2-2,2S21,16.1,21,15z M18,24c-3.31,0-6-2.69-6-6h2c0,2.21,1.79,4,4,4s4-1.79,4-4h2 C24,21.31,21.31,24,18,24z"></path></svg>';

        assistantButton.addEventListener('click', () => {
          YouTubeAIAIAssistant.toggleSidebar();
        });

        ytpRightControls.insertBefore(assistantButton, ytpRightControls.firstChild);
      }
    };

    // We need to wait until YouTube's UI is ready
    const checkForYouTubeUI = setInterval(() => {
      if (document.querySelector('.ytp-right-controls')) {
        addAssistantButton();
        clearInterval(checkForYouTubeUI);

        // Initialize the AI assistant
        YouTubeAIAIAssistant.init();
      }
    }, 1000);
  }
});