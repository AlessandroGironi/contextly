/**
 * YouTube AI Assistant - Content Script (Optimized)
 * Injects and controls the AI assistant sidebar on YouTube video pages
 */

const YouTubeAIAssistant = {
  sidebarContainer: null,
  sidebarVisible: false,
  videoId: null,
  videoTitle: '',
  transcript: [],
  currentPlaybackTime: 0,
  timestampUpdateInterval: null,

  // Initialize the AI assistant
  init: async function() {
    this.extractVideoInfo();
    if (!this.videoId) return;

    this.createSidebar();
    this.showSidebar();
    await this.loadTranscript();
    this.startTracking();
    this.addEventListeners();
  },

  // Extract video ID and title from YouTube page
  extractVideoInfo: function() {
    const urlParams = new URLSearchParams(window.location.search);
    this.videoId = urlParams.get('v');

    // Get video title with fallback
    const titleSelectors = [
      'h1.ytd-video-primary-info-renderer',
      '#title h1',
      'ytd-watch-metadata h1.title'
    ];

    for (const selector of titleSelectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement?.textContent?.trim()) {
        this.videoTitle = titleElement.textContent.trim();
        break;
      }
    }

    if (!this.videoTitle) {
      this.videoTitle = document.title.replace(' - YouTube', '') || 'YouTube Video';
    }

    this.updateSidebarTitle();
  },

  // Create sidebar with simplified HTML
  createSidebar: function() {
    this.sidebarContainer = document.createElement('div');
    this.sidebarContainer.id = 'yt-ai-assistant-container';
    this.sidebarContainer.classList.add('yt-sidebar');

    this.sidebarContainer.innerHTML = `
      <div class="yt-sidebar-header">
        <div class="yt-sidebar-tabs">
          <button id="chat-tab" class="yt-sidebar-tab active">AI Chat</button>
        </div>
        <div class="yt-sidebar-controls">
          <button id="yt-sidebar-minimize" class="yt-sidebar-button" title="Minimize">−</button>
        </div>
      </div>

      <div id="current-video-info" class="yt-video-info">
        <span id="current-video-title">${this.videoTitle}</span>
      </div>

      <div id="chat-section" class="yt-sidebar-section active">
        <div id="chat-container" class="yt-chat-container">
          <div class="yt-chat-messages" id="chat-messages">
            <div class="yt-chat-message system">
              <div class="message-content">Ask me anything about this video!</div>
            </div>
          </div>

          <div class="yt-chat-input">
            <textarea id="question-input" placeholder="Ask about this video..."></textarea>
            <button id="send-question">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    this.insertSidebar();
    this.setupEventListeners();
  },

  // Insert sidebar into YouTube layout
  insertSidebar: function() {
    const secondaryContent = document.querySelector('#secondary');
    if (secondaryContent) {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'width:100%;margin-bottom:16px;position:relative;display:flex;flex-direction:column;min-height:50vh;';
      wrapper.appendChild(this.sidebarContainer);
      secondaryContent.insertBefore(wrapper, secondaryContent.firstChild);
    } else {
      // Fallback to fixed position
      this.sidebarContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:2000;';
      document.body.appendChild(this.sidebarContainer);
    }
  },

  // Set up event listeners
  setupEventListeners: function() {
    // Minimize button
    document.getElementById('yt-sidebar-minimize')?.addEventListener('click', () => {
      this.toggleMinimize();
    });

    // Question input
    const questionInput = document.getElementById('question-input');
    const sendButton = document.getElementById('send-question');

    questionInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && questionInput.value.trim()) {
        e.preventDefault();
        this.handleQuestion(questionInput.value.trim());
        questionInput.value = '';
      }
    });

    sendButton?.addEventListener('click', () => {
      if (questionInput.value.trim()) {
        this.handleQuestion(questionInput.value.trim());
        questionInput.value = '';
      }
    });

    // Global message handler
    window.addEventListener('message', this.handleMessage.bind(this));
  },

  // Handle messages
  handleMessage: function(event) {
    if (!event.data?.action) return;

    const { action, data } = event.data;
    switch (action) {
      case 'seekVideo':
        this.seekVideoToTime(data.time);
        break;
      case 'processQuestion':
        this.processQuestion(data);
        break;
    }
  },

  // Get current video timestamp
  getCurrentVideoTimestamp: function() {
    const videoPlayer = document.querySelector('video');
    if (videoPlayer && !isNaN(videoPlayer.currentTime)) {
      this.currentPlaybackTime = videoPlayer.currentTime;
      return videoPlayer.currentTime;
    }
    return this.currentPlaybackTime;
  },

  // Start tracking video playback
  startTracking: function() {
    if (this.timestampUpdateInterval) {
      clearInterval(this.timestampUpdateInterval);
    }

    this.timestampUpdateInterval = setInterval(() => {
      const videoPlayer = document.querySelector('video');
      if (videoPlayer && !isNaN(videoPlayer.currentTime)) {
        this.currentPlaybackTime = videoPlayer.currentTime;
      }
    }, 250);
  },

  // Handle question submission
  handleQuestion: function(question) {
    this.addChatMessage('user', question);
    this.addLoadingMessage();

    const currentTime = this.getCurrentVideoTimestamp();
    const relevantTranscript = this.getRelevantTranscript(question, currentTime);

    this.processQuestion({
      question,
      transcript: relevantTranscript,
      videoId: this.videoId,
      videoTitle: this.videoTitle,
      currentTime
    });
  },

  // Get relevant transcript section
  getRelevantTranscript: function(question, currentTime) {
    if (!this.transcript.length) {
      return `VIDEO TITLE: ${this.videoTitle}\n\nNo transcript available for this video.`;
    }

    const justSaidPattern = /what (did|was).*(just|recently) (say|said|talking about)/i;

    if (justSaidPattern.test(question)) {
      // Get 30 seconds before current time
      const contextStart = Math.max(0, currentTime - 30);
      const contextSegments = this.transcript.filter(segment => 
        segment.start >= contextStart && segment.start <= currentTime
      );

      if (contextSegments.length > 0) {
        return contextSegments.map(segment => 
          `[${this.formatTime(segment.start)}] ${segment.text}`
        ).join('\n');
      }
    }

    // Default: Get context around current position
    const currentIndex = this.transcript.findIndex(segment => 
      segment.start <= currentTime && segment.end >= currentTime
    );

    const startIndex = Math.max(0, currentIndex - 5);
    const endIndex = Math.min(this.transcript.length, currentIndex + 6);
    const contextSegments = this.transcript.slice(startIndex, endIndex);

    return `VIDEO TITLE: ${this.videoTitle}\n\n` + 
           contextSegments.map(segment => 
             `[${this.formatTime(segment.start)}] ${segment.text}`
           ).join('\n');
  },

  // Process question with OpenAI
  processQuestion: async function(data) {
    try {
      if (!window.OpenAIClient?.isConfigured) {
        await window.OpenAIClient?.init();
      }

      if (!window.OpenAIClient?.isConfigured) {
        throw new Error('OpenAI API key not configured');
      }

      const result = await window.OpenAIClient.processQuestion(
        data.question,
        data.transcript,
        data.videoTitle,
        data.currentTime,
        data.videoId
      );

      this.removeLoadingMessage();
      this.addChatMessage('assistant', result.answer);
    } catch (error) {
      this.removeLoadingMessage();

      if (error.message.includes('rate limit')) {
        this.addChatMessage('assistant', 
          "I'm experiencing high demand right now. Please try again in a few minutes, or check the video transcript directly.");
      } else {
        this.addChatMessage('system', `Error: ${error.message}`);
      }
    }
  },

  // Load transcript
  loadTranscript: async function() {
    try {
      this.transcript = [];
      const transcript = await TranscriptFetcher.fetchTranscript(this.videoId);

      if (transcript?.length > 0) {
        this.transcript = transcript;
        console.log(`Transcript loaded: ${transcript.length} segments`);
      }
    } catch (error) {
      console.error("Error loading transcript:", error);
    }
  },

  // UI helper methods
  addChatMessage: function(role, content) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageEl = document.createElement('div');
    messageEl.className = `yt-chat-message ${role}`;
    messageEl.innerHTML = `<div class="message-content">${content}</div>`;

    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  },

  addLoadingMessage: function() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageEl = document.createElement('div');
    messageEl.className = 'yt-chat-message loading';
    messageEl.id = 'loading-message';
    messageEl.innerHTML = `
      <div class="message-content">
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;

    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  },

  removeLoadingMessage: function() {
    document.getElementById('loading-message')?.remove();
  },

  updateSidebarTitle: function() {
    const titleElement = document.getElementById('current-video-title');
    if (titleElement) {
      titleElement.textContent = this.videoTitle;
    }
  },

  toggleMinimize: function() {
    const isMinimized = this.sidebarContainer.classList.toggle('minimized');
    const minimizeBtn = document.getElementById('yt-sidebar-minimize');
    if (minimizeBtn) {
      minimizeBtn.textContent = isMinimized ? '▲' : '−';
    }
  },

  showSidebar: function() {
    this.sidebarContainer.classList.add('visible');
    this.sidebarVisible = true;
  },

  seekVideoToTime: function(seconds) {
    const videoPlayer = document.querySelector('video');
    if (videoPlayer) {
      videoPlayer.currentTime = seconds;
    }
  },

  formatTime: function(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  },

  // Navigation handling
  addEventListeners: function() {
    let lastVideoId = this.videoId;

    // Check for video changes periodically
    setInterval(() => {
      if (document.location.pathname === '/watch') {
        const currentVideoId = new URLSearchParams(window.location.search).get('v');
        if (currentVideoId && currentVideoId !== lastVideoId) {
          lastVideoId = currentVideoId;
          this.handleVideoChange(currentVideoId);
        }
      }
    }, 2000);
  },

  handleVideoChange: function(newVideoId) {
    this.videoId = newVideoId;
    this.transcript = [];
    this.currentPlaybackTime = 0;

    this.extractVideoInfo();
    this.loadTranscript();

    // Clear chat
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = `
        <div class="yt-chat-message system">
          <div class="message-content">Ask me anything about this video!</div>
        </div>
      `;
    }
  }
};

// Initialize when YouTube is ready
window.addEventListener('load', () => {
  if (window.location.pathname === '/watch' && window.location.search.includes('v=')) {
    const checkForYouTubeUI = setInterval(() => {
      if (document.querySelector('.ytp-right-controls')) {
        clearInterval(checkForYouTubeUI);
        YouTubeAIAssistant.init();
      }
    }, 1000);
  }
});