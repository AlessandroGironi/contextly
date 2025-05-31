/**
 * YouTube AI Assistant - OpenAI Client
 * Handles interactions with the OpenAI API
 * Can use either user-provided key or central API key (when ready for distribution)
 */

// Make the OpenAIClient globally accessible
window.OpenAIClient = {
  apiKey: null,
  isConfigured: false,
  
  // Set to true when ready to use a centralized API key
  useCentralKey: false, 
  
  // This key will be replaced with your provided key when building for distribution
  centralApiKey: "OPENAI_API_KEY_PLACEHOLDER",
  
  // Initialize the OpenAI client
  init: async function() {
    try {
      console.log("Initializing OpenAI client...");
      
      // If using central key, use that directly
      if (this.useCentralKey && this.centralApiKey !== "OPENAI_API_KEY_PLACEHOLDER") {
        console.log("Using centralized API key");
        this.apiKey = this.centralApiKey;
        this.isConfigured = true;
        return true;
      }
      
      // Otherwise try to retrieve from storage
      console.log("Checking for user-provided API key...");
      
      // Try to retrieve API key from storage
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get('openai_api_key', (data) => {
          resolve(data);
        });
      });
      
      if (result && result.openai_api_key) {
        // Basic key format validation
        const apiKey = result.openai_api_key;
        
        if (!apiKey.startsWith('sk-')) {
          console.error("API key format appears invalid - does not start with 'sk-'");
          return false;
        }
        
        if (apiKey.length < 30) {
          console.error("API key appears too short, expected ~50+ characters");
          return false;
        }
        
        // Store key and log success
        this.apiKey = apiKey;
        this.isConfigured = true;
        console.log("OpenAI API key loaded from storage (starts with:", apiKey.substring(0, 5) + "..., length:", apiKey.length + ")");
        
        return true;
      } else {
        console.log("No OpenAI API key found in storage");
        return false;
      }
    } catch (error) {
      console.error("Error initializing OpenAI client:", error);
      console.error("Error details:", error.stack);
      return false;
    }
  },
  
  // Save API key to storage
  saveApiKey: async function(apiKey) {
    // If using central key, don't save user keys
    if (this.useCentralKey) {
      console.log("Using central API key - not saving user key");
      return true;
    }
    
    if (!apiKey || apiKey.trim() === '') {
      console.error("Attempted to save empty API key");
      throw new Error("API key cannot be empty");
    }
    
    const trimmedKey = apiKey.trim();
    
    // Basic validation
    if (!trimmedKey.startsWith('sk-')) {
      console.error("API key format appears invalid - does not start with 'sk-'");
      throw new Error("API key format is invalid. OpenAI API keys should start with 'sk-'");
    }
    
    if (trimmedKey.length < 30) {
      console.error("API key appears too short, expected ~50+ characters");
      throw new Error("API key appears too short. Please check that you've entered the full key");
    }
    
    console.log("Saving API key to storage (starts with:", trimmedKey.substring(0, 5) + "..., length:", trimmedKey.length + ")");
    
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.sync.set({ 'openai_api_key': trimmedKey }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
      
      this.apiKey = trimmedKey;
      this.isConfigured = true;
      console.log("API key saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving OpenAI API key:", error);
      console.error("Error details:", error.stack);
      throw error;
    }
  },
  
  // Clear API key from storage
  clearApiKey: async function() {
    // If using central key, don't allow clearing
    if (this.useCentralKey) {
      console.log("Using central API key - cannot clear");
      return true;
    }
    
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.sync.remove('openai_api_key', () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
      
      this.apiKey = null;
      this.isConfigured = false;
      return true;
    } catch (error) {
      console.error("Error clearing OpenAI API key:", error);
      throw error;
    }
  },
  
  // Check if the API key is valid
  checkApiKey: async function(apiKey) {
    const keyToCheck = apiKey || this.apiKey;
    
    if (!keyToCheck) {
      console.log("No API key provided to check");
      return false;
    }
    
    try {
      console.log("Validating OpenAI API key...");
      // Create clean headers with string literals to avoid non-ISO-8859-1 characters
      const headers = {
        'Authorization': 'Bearer ' + keyToCheck,
        'Content-Type': 'application/json'
      };
      
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: headers
      });
      
      if (response.ok) {
        console.log("API key validation successful");
        return true;
      } else {
        // Get more details about the error
        const errorText = await response.text().catch(() => "Could not read error response");
        console.error(`Invalid OpenAI API key. Status: ${response.status}, Response: ${errorText}`);
        
        if (response.status === 401) {
          console.error("Authentication error - API key is invalid or expired");
        } else if (response.status === 429) {
          console.error("Rate limit exceeded during API key validation");
        } else {
          console.error(`Unexpected error status ${response.status} during API key validation`);
        }
        
        return false;
      }
    } catch (error) {
      console.error("Error checking OpenAI API key:", error);
      console.error("Error details:", error.stack);
      return false;
    }
  },
  
  // Process a question about the video using the latest OpenAI model
  async processQuestion(question, relevantTranscript, videoTitle, currentTime, videoId) {
    console.log(`Processing question for video: "${videoTitle}" (${videoId})`);
    
    if (!this.isConfigured || !this.apiKey) {
      console.error("OpenAI API key not configured in processQuestion");
      throw new Error("OpenAI API key not configured");
    }
    
    // Use the currentTime parameter directly - it should be captured precisely when the user asks the question
    const preciseCurrentTime = currentTime;
    console.log(`Using timestamp captured at question time: ${preciseCurrentTime}s`);
    
    // Store current video details for reference
    this.lastVideoId = videoId;
    this.lastVideoTitle = videoTitle;
    
    // Do quick validation of API key format (without making an API call)
    if (!this.apiKey.startsWith('sk-') || this.apiKey.length < 20) {
      console.error("API key format appears invalid. Keys should start with 'sk-' and be ~50+ characters");
      throw new Error("API key format appears invalid. Please check your OpenAI API key format");
    }
    
    console.log(`Processing question: "${question.substring(0, 30)}..." with API key: sk-***`);
    
    // Define max retry attempts for rate limiting
    const maxRetries = 2; // Reduced to prevent long waits
    let retryCount = 0;
    
    // Extract video description if it's in the transcript (sometimes added at beginning)
    let videoDescription = "";
    if (relevantTranscript.includes("VIDEO TITLE:")) {
      // Description already included in special format from content.js
      videoDescription = "";
    } else {
      // Try to extract description from the first part of transcript (often contains metadata)
      const lines = relevantTranscript.split('\n').slice(0, 5);
      if (lines.some(line => line.includes("description") || line.includes("About:"))) {
        videoDescription = lines.join('\n');
      }
    }
    
    // Prepare system message with context about the video
    const systemMessage = `You are an AI assistant that helps users understand YouTube videos. You speak in a conversational, direct manner and avoid phrases like "the transcript indicates" or "based on the transcript" in your responses.
You have access to the transcript from a video titled "${videoTitle}".
The user is currently at timestamp ${this.formatTime(preciseCurrentTime)}.

IMPORTANT: Your responses should ONLY be about the current video titled "${videoTitle}". Do not include information from other videos.

Instructions:
1. Answer questions as if you are explaining directly to the user, not talking about a transcript.
2. Use a confident, direct tone and avoid hedging phrases.
3. Be concise but thorough, focusing on accurate information from THIS video only.
4. Consider both the video title and transcript content to provide rich, contextual responses.
5. Start responses with direct answers - never start with phrases like "The transcript shows" or "Based on the transcript".
6. When answering factual questions about the video content, be direct (e.g., "He bought a Tesla Model 3" rather than "The transcript mentions he bought a Tesla Model 3").
7. If asked about who is in the video or what it's about, use both the title and transcript information to provide a complete answer.
8. Try to understand the context of the video from both the transcript content and video title.
9. For questions about the video's topic or theme, provide a comprehensive answer that incorporates relevant title information.
10. Be helpful and insightful - give users the feeling you really understand the video's content.
11. For questions about what just happened or what was just said, refer to the content near the current timestamp: ${this.formatTime(preciseCurrentTime)}.`;
    
    // Prepare user message with question and transcript
    const userMessage = `VIDEO INFORMATION:
TITLE: "${videoTitle}"
${videoDescription ? `DESCRIPTION/BEGINNING: ${videoDescription}\n` : ''}
CURRENT TIMESTAMP: ${this.formatTime(preciseCurrentTime)}

CONTEXT FROM VIDEO TRANSCRIPT:
---
${relevantTranscript}
---

QUESTION: ${question}

Remember to answer directly without referencing "the transcript" in your response.
Use information from both the title and transcript to provide a comprehensive answer.
Be conversational and direct in your response.
Your answer should ONLY be about THIS video, not any other videos.`;

    // Helper function for exponential backoff
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Main retry loop
    while (retryCount <= maxRetries) {
      try {
        console.log(`Attempt ${retryCount + 1}: Sending request to OpenAI API...`);
        
        const requestBody = {
          model: "gpt-3.5-turbo", // Using gpt-3.5-turbo for better compatibility and lower rate limits
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 500
        };
        
        console.log("Request payload:", JSON.stringify(requestBody).substring(0, 100) + "...");
        
        // Create clean headers with string literals to avoid non-ISO-8859-1 characters
        const headers = {
          'Authorization': 'Bearer ' + this.apiKey,
          'Content-Type': 'application/json'
        };
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(requestBody)
        });
        
        // Log API response details for debugging
        console.log(`API Response Status: ${response.status} ${response.statusText}`);
        const responseHeaders = {};
        response.headers.forEach((value, name) => {
          responseHeaders[name] = value;
        });
        console.log("Response Headers:", JSON.stringify(responseHeaders));
        
        // Handle rate limit (429) errors with exponential backoff
        if (response.status === 429) {
          // Try to get more detailed error information
          const errorBody = await response.text().catch(() => "Could not read error response");
          console.error(`Rate limit error details: ${errorBody}`);
          
          if (retryCount >= maxRetries) {
            throw new Error(`Rate limit exceeded after ${maxRetries + 1} attempts. Error: ${errorBody}`);
          }
          
          // Get retry time from header or calculate backoff
          const retryAfter = parseInt(response.headers.get('Retry-After') || Math.pow(2, retryCount + 1));
          console.warn(`OpenAI rate limit exceeded. Retrying in ${retryAfter} seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
          
          // Wait before retrying
          await sleep(retryAfter * 1000);
          retryCount++;
          continue;
        }
        
        // Handle authentication errors (likely invalid API key)
        if (response.status === 401) {
          const errorBody = await response.text().catch(() => "Could not read error response");
          console.error(`Authentication error: ${errorBody}`);
          throw new Error("Authentication failed. Please check if your OpenAI API key is valid and has not expired.");
        }
        
        // Handle model error with fallback to gpt-3.5-turbo if needed
        if (response.status === 404) {
          console.warn("Model not found, trying fallback model...");
          
          // Try with fallback model - using plain object headers to avoid encoding issues
          const fallbackHeaders = {
            'Authorization': 'Bearer ' + this.apiKey,
            'Content-Type': 'application/json'
          };
          
          const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: fallbackHeaders,
            body: JSON.stringify({
              model: "gpt-3.5-turbo", // Fallback to a more widely available model
              messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessage }
              ],
              temperature: 0.7,
              max_tokens: 500
            })
          });
          
          if (!fallbackResponse.ok) {
            const fallbackError = await fallbackResponse.json().catch(() => null);
            console.error("Fallback OpenAI API Error:", fallbackError);
            throw new Error(`Fallback OpenAI API Error: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
          }
          
          const fallbackData = await fallbackResponse.json();
          return {
            answer: fallbackData.choices[0].message.content,
            tokens: {
              prompt: fallbackData.usage.prompt_tokens,
              completion: fallbackData.usage.completion_tokens,
              total: fallbackData.usage.total_tokens
            },
            model: "gpt-3.5-turbo" // Note we used the fallback model
          };
        }
        
        // Handle other API errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error("OpenAI API Error:", errorData);
          throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${errorData?.error?.message || ""}`);
        }
        
        // Success! Process the response
        const data = await response.json();
        
        return {
          answer: data.choices[0].message.content,
          tokens: {
            prompt: data.usage.prompt_tokens,
            completion: data.usage.completion_tokens,
            total: data.usage.total_tokens
          },
          model: "gpt-4o" // Note the model used
        };
      } catch (error) {
        // Only retry for network errors and rate limits
        if ((error.name === 'TypeError' || error.message.includes('rate limit')) && retryCount < maxRetries) {
          const waitTime = Math.pow(2, retryCount + 1) * 1000;
          console.warn(`Error: ${error.message}. Retrying in ${waitTime/1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
          await sleep(waitTime);
          retryCount++;
        } else {
          // For other errors, or if we've exceeded retries, throw the error
          console.error("Error processing question with OpenAI:", error);
          
          // Provide a helpful error message for common issues
          if (error.message.includes('rate limit')) {
            throw new Error("OpenAI API rate limit exceeded. Please try again later or consider upgrading your OpenAI account.");
          } else {
            throw error;
          }
        }
      }
    }
    
    // Should not reach here, but just in case
    throw new Error("Failed to process question after multiple attempts");
  },
  
  // Helper to format time for display
  formatTime: function(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }
};

// Initialize OpenAI client when script loads
OpenAIClient.init().catch(console.error);