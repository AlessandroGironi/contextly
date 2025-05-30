/**
 * Transcript Fetcher
 * Handles fetching YouTube video transcripts through multiple methods
 */

const TranscriptFetcher = {
  // Main method to fetch transcript with fallbacks
  fetchTranscript: async function(videoId) {
    try {
      // Method 1: Try YouTube's transcript API
      const apiTranscript = await this.fetchFromYouTubeAPI(videoId);
      if (apiTranscript && apiTranscript.length) {
        console.log("Transcript fetched from YouTube API");
        return apiTranscript;
      }
      
      // Method 2: Try scraping from YouTube UI
      const scrapedTranscript = await this.scrapeFromYouTubeUI(videoId);
      if (scrapedTranscript && scrapedTranscript.length) {
        console.log("Transcript scraped from YouTube UI");
        return scrapedTranscript;
      }
      
      // Method 3: Try parsing from video source
      const parsedTranscript = await this.parseFromVideoSource(videoId);
      if (parsedTranscript && parsedTranscript.length) {
        console.log("Transcript parsed from video source");
        return parsedTranscript;
      }
      
      // Method 4: Direct extract from innertubeAPI
      const innertubeTranscript = await this.extractFromInnertubeAPI(videoId);
      if (innertubeTranscript && innertubeTranscript.length) {
        console.log("Transcript extracted from innertube API");
        return innertubeTranscript;
      }
      
      // Method 5: Generate a placeholder transcript if no other methods worked
      if (await this.videoExists(videoId)) {
        return this.generateBasicTimestamps(videoId);
      }
      
      // No transcript found
      console.log("No transcript found for video:", videoId);
      return null;
    } catch (error) {
      console.error("Error fetching transcript:", error);
      throw error;
    }
  },
  
  // Helper to check if video exists
  videoExists: async function(videoId) {
    try {
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  },
  
  // Generate basic timestamps if no transcript is available
  generateBasicTimestamps: function(videoId) {
    console.log("Generating basic timestamps for video:", videoId);
    
    // Get the video duration if possible
    let duration = 0;
    const videoElement = document.querySelector('video');
    if (videoElement && videoElement.duration) {
      duration = videoElement.duration;
    } else {
      // Default to 10 minutes if we can't get the duration
      duration = 600;
    }
    
    // Create placeholder transcript with timestamps every 30 seconds
    const transcript = [];
    const interval = 30; // 30 second intervals
    
    for (let time = 0; time < duration; time += interval) {
      transcript.push({
        start: time,
        duration: interval,
        end: time + interval,
        text: `Timestamp at ${this.formatTimestamp(time)}`
      });
    }
    
    console.log("Generated basic timestamp markers for video");
    return transcript;
  },
  
  // Format timestamp for display
  formatTimestamp: function(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  },
  
  // Method 1: Fetch from YouTube's transcript API
  fetchFromYouTubeAPI: async function(videoId) {
    try {
      // First, get the list of available transcripts
      const listUrl = `https://video.google.com/timedtext?type=list&v=${videoId}`;
      const listResponse = await fetch(listUrl);
      const listText = await listResponse.text();
      
      // Parse XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(listText, "text/xml");
      const tracks = xmlDoc.getElementsByTagName("track");
      
      if (tracks.length === 0) {
        return null; // No transcripts available
      }
      
      // Prioritize English transcript if available
      let langCode = "";
      let langName = "";
      
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const trackLang = track.getAttribute("lang_code");
        const trackName = track.getAttribute("name") || "";
        
        // Prefer English or auto-generated English
        if (trackLang === "en" || trackLang === "en-US") {
          langCode = trackLang;
          langName = trackName;
          break;
        }
        
        // If no English found yet, save the first one as fallback
        if (i === 0) {
          langCode = trackLang;
          langName = trackName;
        }
      }
      
      // Fetch the transcript with the selected language
      let transcriptUrl = `https://video.google.com/timedtext?lang=${langCode}&v=${videoId}`;
      
      // Add name parameter if it exists
      if (langName) {
        transcriptUrl += `&name=${encodeURIComponent(langName)}`;
      }
      
      const transcriptResponse = await fetch(transcriptUrl);
      const transcriptText = await transcriptResponse.text();
      
      // Parse XML response to get transcript
      const transcriptXml = parser.parseFromString(transcriptText, "text/xml");
      const textElements = transcriptXml.getElementsByTagName("text");
      
      const transcript = [];
      
      for (let i = 0; i < textElements.length; i++) {
        const text = textElements[i];
        const start = parseFloat(text.getAttribute("start"));
        const duration = parseFloat(text.getAttribute("dur") || "0");
        
        // Convert HTML entities and remove HTML tags
        const textContent = this.cleanTranscriptText(text.textContent);
        
        if (textContent.trim()) {
          transcript.push({
            start,
            duration,
            end: start + duration,
            text: textContent
          });
        }
      }
      
      return transcript;
    } catch (error) {
      console.error("Error fetching from YouTube API:", error);
      return null; // Return null to trigger fallback
    }
  },
  
  // Method 2: Scrape transcript from YouTube UI
  scrapeFromYouTubeUI: async function(videoId) {
    try {
      // Find and click the "Show transcript" button
      const findTranscriptButton = () => {
        // Look for the "Show transcript" button in the UI
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(button => 
          button.textContent.toLowerCase().includes('transcript') ||
          button.innerText.toLowerCase().includes('transcript')
        );
      };
      
      // Try to find and click the transcript button
      const transcriptButton = findTranscriptButton();
      if (transcriptButton) {
        transcriptButton.click();
        
        // Wait for the transcript panel to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Look for transcript segments
        const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
        
        if (transcriptSegments && transcriptSegments.length) {
          const transcript = [];
          
          transcriptSegments.forEach(segment => {
            // Get timestamp and text
            const timestampElement = segment.querySelector('.segment-timestamp');
            const textElement = segment.querySelector('.segment-text');
            
            if (timestampElement && textElement) {
              const timestampText = timestampElement.textContent.trim();
              const text = textElement.textContent.trim();
              
              // Convert timestamp (MM:SS) to seconds
              const start = this.timestampToSeconds(timestampText);
              
              transcript.push({
                start,
                duration: 0, // We don't have duration from UI scraping
                end: 0,      // We don't have end time from UI scraping
                text
              });
            }
          });
          
          // Calculate durations based on start times
          for (let i = 0; i < transcript.length - 1; i++) {
            transcript[i].duration = transcript[i + 1].start - transcript[i].start;
            transcript[i].end = transcript[i + 1].start;
          }
          
          // For the last segment, assume a default duration
          if (transcript.length > 0) {
            const lastIndex = transcript.length - 1;
            transcript[lastIndex].duration = 5; // Default 5 seconds for last segment
            transcript[lastIndex].end = transcript[lastIndex].start + 5;
          }
          
          return transcript;
        }
      }
      
      return null; // No transcript found in UI
    } catch (error) {
      console.error("Error scraping from YouTube UI:", error);
      return null; // Return null to trigger fallback
    }
  },
  
  // Method 3: Parse from video source (client-side fallback)
  parseFromVideoSource: async function(videoId) {
    try {
      // This is a simplified fallback that attempts to check for captions in the video player
      const videoElement = document.querySelector('video');
      if (!videoElement) {
        return null;
      }
      
      // Check if video has textTracks
      if (videoElement.textTracks && videoElement.textTracks.length > 0) {
        const textTrack = videoElement.textTracks[0];
        textTrack.mode = 'showing';
        
        // Wait a moment for text tracks to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (textTrack.cues && textTrack.cues.length > 0) {
          const transcript = [];
          
          for (let i = 0; i < textTrack.cues.length; i++) {
            const cue = textTrack.cues[i];
            transcript.push({
              start: cue.startTime,
              duration: cue.endTime - cue.startTime,
              end: cue.endTime,
              text: this.cleanTranscriptText(cue.text)
            });
          }
          
          return transcript;
        }
      }
      
      // Advanced fallback: Try to extract captions from innertubeapi
      return await this.extractFromInnertubeAPI(videoId);
    } catch (error) {
      console.error("Error parsing from video source:", error);
      return null;
    }
  },
  
  // Method 4: Extract captions from innertube API
  extractFromInnertubeAPI: async function(videoId) {
    try {
      // Get video page to extract additional data
      const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      const videoPageHtml = await videoPageResponse.text();
      
      // Extract ytInitialPlayerResponse JSON
      const initDataMatch = videoPageHtml.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (!initDataMatch || !initDataMatch[1]) {
        return null;
      }
      
      let playerResponse;
      try {
        playerResponse = JSON.parse(initDataMatch[1]);
      } catch (e) {
        console.error("Failed to parse player response:", e);
        return null;
      }
      
      // Check for captions track in player response
      if (!playerResponse.captions || 
          !playerResponse.captions.playerCaptionsTracklistRenderer || 
          !playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks ||
          !playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks.length) {
        return null;
      }
      
      // Get available caption tracks
      const captionTracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
      
      // Prioritize English track or take the first one
      let captionTrack = captionTracks.find(track => 
        track.languageCode === 'en' || track.languageCode === 'en-US'
      ) || captionTracks[0];
      
      if (!captionTrack || !captionTrack.baseUrl) {
        return null;
      }
      
      // Fetch caption track
      const captionResponse = await fetch(captionTrack.baseUrl);
      const captionXml = await captionResponse.text();
      
      // Parse XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(captionXml, "text/xml");
      const textElements = xmlDoc.getElementsByTagName("text");
      
      if (!textElements || !textElements.length) {
        return null;
      }
      
      // Process caption data
      const transcript = [];
      for (let i = 0; i < textElements.length; i++) {
        const text = textElements[i];
        const start = parseFloat(text.getAttribute("start"));
        const duration = parseFloat(text.getAttribute("dur") || "0");
        
        // Convert HTML entities and remove HTML tags
        const textContent = this.cleanTranscriptText(text.textContent);
        
        if (textContent.trim()) {
          transcript.push({
            start,
            duration,
            end: start + duration,
            text: textContent
          });
        }
      }
      
      return transcript.length > 0 ? transcript : null;
      
    } catch (error) {
      console.error("Error extracting from innertube API:", error);
      return null;
    }
  },
  
  // Helper method to convert timestamp to seconds
  timestampToSeconds: function(timestamp) {
    const parts = timestamp.split(':');
    
    if (parts.length === 3) {
      // Format: HH:MM:SS
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      // Format: MM:SS
      return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    } else {
      // Invalid format
      return 0;
    }
  },
  
  // Helper method to clean transcript text
  cleanTranscriptText: function(text) {
    // Create a temporary DOM element
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    
    // Get text content (this removes HTML tags)
    let cleanText = tempDiv.textContent || tempDiv.innerText || '';
    
    // Replace common HTML entities
    cleanText = cleanText
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    return cleanText.trim();
  }
};
