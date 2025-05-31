/**
 * YouTube AI Assistant - OpenAI Client (Optimized)
 * Handles interactions with the OpenAI API efficiently
 */
window.OpenAIClient = {
  apiKey: null,
  isConfigured: false,

  // Initialize the OpenAI client
  init: async function() {
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get('openai_api_key', resolve);
      });

      if (result?.openai_api_key) {
        const apiKey = result.openai_api_key;

        if (this.isValidApiKey(apiKey)) {
          this.apiKey = apiKey;
          this.isConfigured = true;
          console.log("OpenAI API key loaded successfully");
          return true;
        }
      }

      console.log("No valid OpenAI API key found");
      return false;
    } catch (error) {
      console.error("Error initializing OpenAI client:", error);
      return false;
    }
  },

  // Validate API key format
  isValidApiKey: function(apiKey) {
    return apiKey && apiKey.startsWith('sk-') && apiKey.length > 30;
  },

  // Save API key to storage
  saveApiKey: async function(apiKey) {
    if (!this.isValidApiKey(apiKey)) {
      throw new Error("Invalid API key format. OpenAI API keys should start with 'sk-'");
    }

    try {
      await new Promise((resolve, reject) => {
        chrome.storage.sync.set({ 'openai_api_key': apiKey.trim() }, () => {
          chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve();
        });
      });

      this.apiKey = apiKey.trim();
      this.isConfigured = true;
      return true;
    } catch (error) {
      console.error("Error saving API key:", error);
      throw error;
    }
  },

  // Process question with optimized prompting
  async processQuestion(question, relevantTranscript, videoTitle, currentTime, videoId) {
    if (!this.isConfigured || !this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const systemMessage = `You are a YouTube video assistant. Answer questions about the video "${videoTitle}" directly and conversationally. 
Current timestamp: ${this.formatTime(currentTime)}.
Be concise, helpful, and speak naturally without referencing "the transcript".`;

    const userMessage = `VIDEO: "${videoTitle}"
CONTENT: ${relevantTranscript}
QUESTION: ${question}`;

    const requestBody = {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 400
    };

    try {
      const response = await this.makeApiRequest(requestBody);
      return {
        answer: response.choices[0].message.content,
        tokens: response.usage
      };
    } catch (error) {
      if (error.message.includes('429')) {
        throw new Error("Rate limit exceeded. Please try again in a few minutes.");
      }
      throw error;
    }
  },

  // Make API request with retry logic
  async makeApiRequest(requestBody, retries = 1) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (response.status === 429 && attempt < retries) {
          await this.sleep(Math.pow(2, attempt + 1) * 1000);
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (attempt === retries) throw error;
        await this.sleep(1000);
      }
    }
  },

  // Helper methods
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),

  formatTime: function(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }
};

// Initialize on load
OpenAIClient.init().catch(console.error);