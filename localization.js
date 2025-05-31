/**
 * YouTube AI Assistant - Localization System
 * Handles automatic language detection and UI translations
 */

class LocalizationManager {
  constructor() {
    this.currentLanguage = 'en';
    this.fallbackLanguage = 'en';
    this.translations = {};
    this.supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'];

    this.init();
  }

  // Initialize localization system
  async init() {
    // Detect user's preferred language
    this.detectLanguage();

    // Load translations
    await this.loadTranslations();

    // Apply translations to the page
    this.applyTranslations();
  }

  // Detect user's preferred language from browser settings
  detectLanguage() {
    // Get browser language preferences
    const browserLanguages = navigator.languages || [navigator.language || navigator.userLanguage];

    console.log('Browser languages detected:', browserLanguages);

    // Find the first supported language
    for (const lang of browserLanguages) {
      // Extract language code (e.g., 'en' from 'en-US')
      const langCode = lang.split('-')[0].toLowerCase();

      if (this.supportedLanguages.includes(langCode)) {
        this.currentLanguage = langCode;
        console.log(`Language set to: ${this.currentLanguage}`);
        return;
      }
    }

    // Fallback to default language
    this.currentLanguage = this.fallbackLanguage;
    console.log(`Using fallback language: ${this.currentLanguage}`);
  }

  // Load translations for current language
  async loadTranslations() {
    try {
      // Load translations from the translations object
      this.translations = this.getTranslations();
      console.log(`Translations loaded for language: ${this.currentLanguage}`);
    } catch (error) {
      console.error('Error loading translations:', error);
      // Fallback to English if loading fails
      this.currentLanguage = this.fallbackLanguage;
      this.translations = this.getTranslations();
    }
  }

  // Get translation text
  t(key, params = {}) {
    const langTranslations = this.translations[this.currentLanguage] || this.translations[this.fallbackLanguage];
    let text = langTranslations[key] || key;

    // Replace parameters in text
    Object.keys(params).forEach(param => {
      text = text.replace(`{{${param}}}`, params[param]);
    });

    return text;
  }

  // Apply translations to UI elements
  applyTranslations() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.translatePage());
    } else {
      this.translatePage();
    }
  }

  // Translate all elements on the page
  translatePage() {
    // Find all elements with data-i18n attribute
    const elements = document.querySelectorAll('[data-i18n]');

    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translatedText = this.t(key);

      // Update element content
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        if (element.type === 'submit' || element.type === 'button') {
          element.value = translatedText;
        } else {
          element.placeholder = translatedText;
        }
      } else {
        element.textContent = translatedText;
      }
    });

    // Translate title attributes
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.t(key);
    });

    console.log('Page translations applied');
  }

  // Get all translations
  getTranslations() {
    return {
      en: {
        // Header and tabs
        'chat_tab': 'ChatBot',
        'transcript_tab': 'Transcript',
        'minimize_sidebar': 'Minimize sidebar',
        'expand_sidebar': 'Expand sidebar',

        // Video info
        'loading_video': 'Loading...',
        'now_playing': 'Now playing:',

        // Chat messages
        'welcome_message': 'I\'m your YouTube assistant. Ask me anything about this video!',
        'new_video_detected': 'New video detected: "{{title}}"',
        'now_watching': 'Now watching: "{{title}}" - Ask me any questions about this video!',
        'transcript_loaded': 'Transcript loaded for: "{{title}}"',
        'no_transcript_video': 'No transcript available for video: "{{title}}"',
        'transcript_error': 'Transcript error: {{error}}',

        // API key section
        'api_key_prompt': 'Please enter your OpenAI API key to use the AI assistant:',
        'api_key_placeholder': 'sk-...',
        'save_key': 'Save',
        'api_key_info': 'Your API key is stored locally and only used to communicate with OpenAI.',
        'api_ready': 'Ready to answer questions about this video!',
        'change_key': 'Change key',
        'builtin_key_info': 'This extension uses a built-in API key. You can ask questions right away!',
        'builtin_key_configured': 'This extension uses a built-in API key. No configuration needed!',

        // Chat input
        'question_placeholder': 'Ask about this video...',

        // Transcript section
        'loading_transcript': 'Loading transcript...',
        'no_transcript_available': 'No transcript available for this video.',
        'transcript_load_error': 'Error loading transcript: {{error}}',

        // Error messages
        'error_prefix': 'Error: ',
        'rate_limit_error': 'OpenAI API rate limit exceeded. Please try again in a few minutes or use the transcript tab to read directly.',
        'invalid_api_key': 'Your API key appears to be invalid. Please update your OpenAI API key in the settings.',
        'insufficient_quota': 'Your OpenAI account has insufficient quota. Please check your billing details on openai.com.',
        'api_key_save_error': 'Error: {{error}}',
        'api_key_saved': 'API key saved successfully',

        // AI responses
        'no_transcript_response': 'I\'m sorry, but I couldn\'t access the transcript for this video. Without the transcript, I can\'t answer questions about the video content.',
        'just_said_no_transcript': 'I\'m sorry, but I couldn\'t access the transcript for this video. Without the transcript, I can\'t tell you what was just said. You may want to try enabling captions in the YouTube player instead.',
        'rate_limit_fallback': 'I can\'t process your question right now due to API rate limits, but here\'s part of the transcript for this section:',
        'try_again_later': 'You can try again in a few minutes or use the transcript tab to read directly.',
        'based_on_transcript': 'Based on the transcript, this is what was just said:',
        'recent_transcript_unavailable': 'I couldn\'t find the exact recent transcript around the current playback time. You can check the Transcript tab to see what was said throughout the video.',
        'no_transcript_captions': 'I couldn\'t access the transcript to tell you what was just said. You might want to try enabling captions in the YouTube player.',

        // Time format
        'timestamp_at': 'Timestamp at {{time}}',

        // General
        'unknown_video': 'Unknown video',
        'youtube_video': 'YouTube Video'
      }
    };
  }

  // Change language dynamically
  changeLanguage(newLanguage) {
    if (this.supportedLanguages.includes(newLanguage)) {
      this.currentLanguage = newLanguage;
      this.translatePage();
      console.log(`Language changed to: ${newLanguage}`);
    } else {
      console.warn(`Language ${newLanguage} is not supported`);
    }
  }

  // Get current language
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  // Get supported languages
  getSupportedLanguages() {
    return this.supportedLanguages;
  }
}

// Create global instance
window.LocalizationManager = new LocalizationManager();