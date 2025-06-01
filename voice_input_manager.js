
/**
 * YouTube AI Assistant - Voice Input Manager
 * Handles speech recognition and voice input functionality
 */

class VoiceInputManager {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isSupported = false;
    this.isEnabled = true;
    this.currentLanguage = 'en-US';
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onStatusCallback = null;

    this.init();
  }

  // Initialize speech recognition
  init() {
    // Check for speech recognition support
    this.isSupported = this.checkSupport();

    if (!this.isSupported) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    // Load settings
    this.loadSettings();

    // Initialize recognition
    this.setupRecognition();
  }

  // Check if speech recognition is supported
  checkSupport() {
    const hasAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    console.log('Speech recognition support check:', {
      SpeechRecognition: !!window.SpeechRecognition,
      webkitSpeechRecognition: !!window.webkitSpeechRecognition,
      supported: hasAPI,
      userAgent: navigator.userAgent
    });
    return hasAPI;
  }

  // Load settings from storage
  async loadSettings() {
    try {
      // Load voice input enabled setting
      const voiceEnabled = localStorage.getItem('yt-ai-voice-input-enabled');
      this.isEnabled = voiceEnabled !== null ? voiceEnabled === 'true' : true;

      // Set language based on localization
      if (window.LocalizationManager) {
        const currentLang = window.LocalizationManager.getCurrentLanguage();
        this.currentLanguage = this.getLanguageCode(currentLang);
      }

      console.log(`Voice input initialized: enabled=${this.isEnabled}, language=${this.currentLanguage}`);
    } catch (error) {
      console.error('Error loading voice input settings:', error);
    }
  }

  // Get speech recognition language code from UI language
  getLanguageCode(uiLanguage) {
    const languageMap = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-BR',
      'ru': 'ru-RU',
      'zh': 'zh-CN',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'ar': 'ar-SA',
      'hi': 'hi-IN'
    };

    return languageMap[uiLanguage] || 'en-US';
  }

  // Setup speech recognition
  setupRecognition() {
    if (!this.isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Configure recognition
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = this.currentLanguage;
    this.recognition.maxAlternatives = 1;

    // Event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      this.notifyStatus('listening');
      console.log('Voice recognition started');
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // If we have a final result, process it
      if (finalTranscript.trim()) {
        this.handleResult(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      this.handleError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.notifyStatus('ended');
      console.log('Voice recognition ended');
    };
  }

  // Start listening
  startListening() {
    if (!this.isSupported) {
      this.handleError('not_supported');
      return false;
    }

    if (!this.isEnabled) {
      this.handleError('disabled');
      return false;
    }

    if (this.isListening) {
      console.warn('Already listening');
      return false;
    }

    try {
      // Update language if it changed
      if (this.recognition) {
        this.recognition.lang = this.currentLanguage;
      }

      this.recognition.start();
      return true;
    } catch (error) {
      this.handleError('start_failed');
      return false;
    }
  }

  // Stop listening
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  // Handle recognition result
  handleResult(transcript) {
    console.log('Voice recognition result:', transcript);
    
    if (this.onResultCallback) {
      this.onResultCallback(transcript);
    }
  }

  // Handle recognition error
  handleError(error) {
    console.error('Voice recognition error:', error);
    
    let errorMessage = 'voice_error';
    
    switch (error) {
      case 'not-allowed':
      case 'permission-denied':
        errorMessage = 'voice_permission_denied';
        break;
      case 'not_supported':
        errorMessage = 'voice_not_supported';
        break;
      case 'no-speech':
        errorMessage = 'voice_no_speech';
        break;
      case 'network':
        errorMessage = 'voice_network_error';
        break;
      default:
        errorMessage = 'voice_error';
    }

    if (this.onErrorCallback) {
      this.onErrorCallback(errorMessage);
    }

    this.notifyStatus('error');
  }

  // Notify status change
  notifyStatus(status) {
    if (this.onStatusCallback) {
      this.onStatusCallback(status);
    }
  }

  // Set enabled state
  setEnabled(enabled) {
    this.isEnabled = enabled;
    localStorage.setItem('yt-ai-voice-input-enabled', enabled.toString());
    console.log(`Voice input ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Set language
  setLanguage(languageCode) {
    this.currentLanguage = this.getLanguageCode(languageCode);
    
    if (this.recognition) {
      this.recognition.lang = this.currentLanguage;
    }
    
    console.log(`Voice input language set to: ${this.currentLanguage}`);
  }

  // Set callback functions
  setCallbacks(onResult, onError, onStatus) {
    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onStatusCallback = onStatus;
  }

  // Get current state
  getState() {
    return {
      isSupported: this.isSupported,
      isEnabled: this.isEnabled,
      isListening: this.isListening,
      currentLanguage: this.currentLanguage
    };
  }
}

// Export for use in other scripts
window.VoiceInputManager = VoiceInputManager;
