/**
 * Transcript Fetcher (Optimized)
 * Efficiently fetches YouTube video transcripts
 */

const TranscriptFetcher = {
  // Main method to fetch transcript
  fetchTranscript: async function(videoId) {
    try {
      // Try YouTube's caption API first
      const transcript = await this.fetchFromCaptionAPI(videoId);
      if (transcript?.length) {
        console.log(`Transcript fetched: ${transcript.length} segments`);
        return transcript;
      }

      // Fallback to basic timestamps
      return this.generateBasicTimestamps();
    } catch (error) {
      console.error("Error fetching transcript:", error);
      return [];
    }
  },

  // Fetch from YouTube's caption API
  fetchFromCaptionAPI: async function(videoId) {
    try {
      // Get available caption tracks
      const listUrl = `https://video.google.com/timedtext?type=list&v=${videoId}`;
      const listResponse = await fetch(listUrl);

      if (!listResponse.ok) return null;

      const listText = await listResponse.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(listText, "text/xml");
      const tracks = xmlDoc.getElementsByTagName("track");

      if (!tracks.length) return null;

      // Find English track or use first available
      let selectedTrack = null;
      for (let track of tracks) {
        const langCode = track.getAttribute("lang_code");
        if (langCode === "en" || langCode === "en-US") {
          selectedTrack = track;
          break;
        }
      }
      if (!selectedTrack) selectedTrack = tracks[0];

      // Fetch transcript
      const langCode = selectedTrack.getAttribute("lang_code");
      const transcriptUrl = `https://video.google.com/timedtext?lang=${langCode}&v=${videoId}`;

      const transcriptResponse = await fetch(transcriptUrl);
      if (!transcriptResponse.ok) return null;

      const transcriptText = await transcriptResponse.text();
      const transcriptXml = parser.parseFromString(transcriptText, "text/xml");
      const textElements = transcriptXml.getElementsByTagName("text");

      const transcript = [];
      for (let element of textElements) {
        const start = parseFloat(element.getAttribute("start"));
        const duration = parseFloat(element.getAttribute("dur") || "3");
        const text = this.cleanText(element.textContent);

        if (text.trim()) {
          transcript.push({
            start,
            duration,
            end: start + duration,
            text
          });
        }
      }

      return transcript.length > 0 ? transcript : null;
    } catch (error) {
      console.error("Caption API error:", error);
      return null;
    }
  },

  // Generate basic timestamps as fallback
  generateBasicTimestamps: function() {
    const videoElement = document.querySelector('video');
    const duration = videoElement?.duration || 600; // Default 10 minutes

    const transcript = [];
    for (let time = 0; time < duration; time += 30) {
      transcript.push({
        start: time,
        duration: 30,
        end: time + 30,
        text: `Content at ${this.formatTime(time)}`
      });
    }

    return transcript;
  },

  // Clean transcript text
  cleanText: function(text) {
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  },

  // Format time for display
  formatTime: function(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
};