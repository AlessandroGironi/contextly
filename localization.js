
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
    // Get browser language preferences with better fallback handling
    let browserLanguages = [];
    
    if (navigator.languages && navigator.languages.length > 0) {
      browserLanguages = navigator.languages;
    } else if (navigator.language) {
      browserLanguages = [navigator.language];
    } else if (navigator.userLanguage) {
      browserLanguages = [navigator.userLanguage];
    } else {
      browserLanguages = ['en'];
    }

    console.log('Browser languages detected:', browserLanguages);

    // Find the first supported language
    for (const lang of browserLanguages) {
      if (!lang) continue;
      
      // Extract language code (e.g., 'en' from 'en-US')
      const langCode = lang.toLowerCase().split('-')[0];

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

    // Translate placeholder attributes
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.t(key);
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
        'settings_tab': 'Settings',
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

        // Settings section
        'smart_pause_mode': 'Smart Pause Mode',
        'smart_pause_description': 'Automatically pauses video when typing in chat',
        'voice_input_mode': 'Enable Voice Input',
        'voice_input_description': 'Use voice to ask questions about the video',
        'voice_language_label': 'Voice Recognition Language',
        'voice_language_description': 'Choose the language for speech recognition',

        // Voice input
        'voice_listening': 'Listening...',
        'voice_start_listening': 'Start voice input',
        'voice_stop_listening': 'Stop listening',
        'voice_not_supported': 'Voice input is not available in this browser. Please use a Chromium-based browser (Chrome, Edge, Brave).',
        'voice_error_generic': 'Voice recognition error occurred. Please try again.',
        'voice_error_permission': 'Microphone permission denied. Please allow microphone access and try again.',
        'voice_error_no_speech': 'No speech was detected. Please try speaking again.',
        'voice_error_network': 'Network error during voice recognition. Please check your connection.',

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
      },

      es: {
        // Header and tabs
        'chat_tab': 'ChatBot',
        'transcript_tab': 'Transcripción',
        'settings_tab': 'Configuración',
        'minimize_sidebar': 'Minimizar barra lateral',
        'expand_sidebar': 'Expandir barra lateral',

        // Video info
        'loading_video': 'Cargando...',
        'now_playing': 'Reproduciendo ahora:',

        // Chat messages
        'welcome_message': '¡Soy tu asistente de YouTube. Pregúntame cualquier cosa sobre este video!',
        'new_video_detected': 'Nuevo video detectado: "{{title}}"',
        'now_watching': 'Viendo ahora: "{{title}}" - ¡Hazme cualquier pregunta sobre este video!',
        'transcript_loaded': 'Transcripción cargada para: "{{title}}"',
        'no_transcript_video': 'No hay transcripción disponible para el video: "{{title}}"',
        'transcript_error': 'Error de transcripción: {{error}}',

        // API key section
        'api_key_prompt': 'Por favor, ingresa tu clave API de OpenAI para usar el asistente de IA:',
        'api_key_placeholder': 'sk-...',
        'save_key': 'Guardar',
        'api_key_info': 'Tu clave API se almacena localmente y solo se usa para comunicarse con OpenAI.',
        'api_ready': '¡Listo para responder preguntas sobre este video!',
        'change_key': 'Cambiar clave',
        'builtin_key_info': 'Esta extensión usa una clave API integrada. ¡Puedes hacer preguntas de inmediato!',
        'builtin_key_configured': 'Esta extensión usa una clave API integrada. ¡No se necesita configuración!',

        // Chat input
        'question_placeholder': 'Pregunta sobre este video...',

        // Transcript section
        'loading_transcript': 'Cargando transcripción...',
        'no_transcript_available': 'No hay transcripción disponible para este video.',
        'transcript_load_error': 'Error cargando transcripción: {{error}}',

        // Settings section
        'smart_pause_mode': 'Modo Pausa Inteligente',
        'smart_pause_description': 'Pausa automáticamente el video al escribir en el chat',
        'voice_input_mode': 'Habilitar Entrada de Voz',
        'voice_input_description': 'Usar voz para hacer preguntas sobre el video',
        'voice_language_label': 'Idioma de Reconocimiento de Voz',
        'voice_language_description': 'Elegir el idioma para el reconocimiento de voz',

        // Voice input
        'voice_listening': 'Escuchando...',
        'voice_start_listening': 'Iniciar entrada de voz',
        'voice_stop_listening': 'Dejar de escuchar',
        'voice_not_supported': 'La entrada de voz no está disponible en este navegador. Por favor usa un navegador basado en Chromium (Chrome, Edge, Brave).',
        'voice_error_generic': 'Ocurrió un error de reconocimiento de voz. Por favor inténtalo de nuevo.',
        'voice_error_permission': 'Permiso de micrófono denegado. Por favor permite el acceso al micrófono e inténtalo de nuevo.',
        'voice_error_no_speech': 'No se detectó voz. Por favor intenta hablar de nuevo.',
        'voice_error_network': 'Error de red durante el reconocimiento de voz. Por favor verifica tu conexión.',

        // Error messages
        'error_prefix': 'Error: ',
        'rate_limit_error': 'Límite de velocidad de la API de OpenAI excedido. Por favor, inténtalo de nuevo en unos minutos o usa la pestaña de transcripción para leer directamente.',
        'invalid_api_key': 'Tu clave API parece ser inválida. Por favor, actualiza tu clave API de OpenAI en la configuración.',
        'insufficient_quota': 'Tu cuenta de OpenAI tiene cuota insuficiente. Por favor, verifica los detalles de facturación en openai.com.',
        'api_key_save_error': 'Error: {{error}}',
        'api_key_saved': 'Clave API guardada exitosamente',

        // AI responses
        'no_transcript_response': 'Lo siento, pero no pude acceder a la transcripción de este video. Sin la transcripción, no puedo responder preguntas sobre el contenido del video.',
        'just_said_no_transcript': 'Lo siento, pero no pude acceder a la transcripción de este video. Sin la transcripción, no puedo decirte lo que se acaba de decir. Podrías intentar habilitar los subtítulos en el reproductor de YouTube.',
        'rate_limit_fallback': 'No puedo procesar tu pregunta ahora debido a límites de velocidad de la API, pero aquí está parte de la transcripción para esta sección:',
        'try_again_later': 'Puedes intentar de nuevo en unos minutos o usar la pestaña de transcripción para leer directamente.',
        'based_on_transcript': 'Basado en la transcripción, esto es lo que se acaba de decir:',
        'recent_transcript_unavailable': 'No pude encontrar la transcripción reciente exacta alrededor del tiempo de reproducción actual. Puedes revisar la pestaña de Transcripción para ver lo que se dijo a lo largo del video.',
        'no_transcript_captions': 'No pude acceder a la transcripción para decirte lo que se acaba de decir. Podrías intentar habilitar los subtítulos en el reproductor de YouTube.',

        // Time format
        'timestamp_at': 'Marca de tiempo en {{time}}',

        // General
        'unknown_video': 'Video desconocido',
        'youtube_video': 'Video de YouTube'
      },

      fr: {
        // Header and tabs
        'chat_tab': 'ChatBot',
        'transcript_tab': 'Transcription',
        'settings_tab': 'Paramètres',
        'minimize_sidebar': 'Réduire la barre latérale',
        'expand_sidebar': 'Agrandir la barre latérale',

        // Video info
        'loading_video': 'Chargement...',
        'now_playing': 'En cours de lecture :',

        // Chat messages
        'welcome_message': 'Je suis votre assistant YouTube. Posez-moi n\'importe quelle question sur cette vidéo !',
        'new_video_detected': 'Nouvelle vidéo détectée : "{{title}}"',
        'now_watching': 'En cours de visionnage : "{{title}}" - Posez-moi des questions sur cette vidéo !',
        'transcript_loaded': 'Transcription chargée pour : "{{title}}"',
        'no_transcript_video': 'Aucune transcription disponible pour la vidéo : "{{title}}"',
        'transcript_error': 'Erreur de transcription : {{error}}',

        // API key section
        'api_key_prompt': 'Veuillez entrer votre clé API OpenAI pour utiliser l\'assistant IA :',
        'api_key_placeholder': 'sk-...',
        'save_key': 'Sauvegarder',
        'api_key_info': 'Votre clé API est stockée localement et utilisée uniquement pour communiquer avec OpenAI.',
        'api_ready': 'Prêt à répondre aux questions sur cette vidéo !',
        'change_key': 'Changer la clé',
        'builtin_key_info': 'Cette extension utilise une clé API intégrée. Vous pouvez poser des questions immédiatement !',
        'builtin_key_configured': 'Cette extension utilise une clé API intégrée. Aucune configuration nécessaire !',

        // Chat input
        'question_placeholder': 'Posez des questions sur cette vidéo...',

        // Transcript section
        'loading_transcript': 'Chargement de la transcription...',
        'no_transcript_available': 'Aucune transcription disponible pour cette vidéo.',
        'transcript_load_error': 'Erreur lors du chargement de la transcription : {{error}}',

        // Settings section
        'smart_pause_mode': 'Mode Pause Intelligente',
        'smart_pause_description': 'Met automatiquement en pause la vidéo lors de la saisie dans le chat',
        'voice_input_mode': 'Activer l\'Entrée Vocale',
        'voice_input_description': 'Utiliser la voix pour poser des questions sur la vidéo',
        'voice_language_label': 'Langue de Reconnaissance Vocale',
        'voice_language_description': 'Choisir la langue pour la reconnaissance vocale',

        // Voice input
        'voice_listening': 'Écoute...',
        'voice_start_listening': 'Démarrer l\'entrée vocale',
        'voice_stop_listening': 'Arrêter d\'écouter',
        'voice_not_supported': 'L\'entrée vocale n\'est pas disponible dans ce navigateur. Veuillez utiliser un navigateur basé sur Chromium (Chrome, Edge, Brave).',
        'voice_error_generic': 'Une erreur de reconnaissance vocale s\'est produite. Veuillez réessayer.',
        'voice_error_permission': 'Permission du microphone refusée. Veuillez autoriser l\'accès au microphone et réessayer.',
        'voice_error_no_speech': 'Aucune parole détectée. Veuillez essayer de parler à nouveau.',
        'voice_error_network': 'Erreur réseau lors de la reconnaissance vocale. Veuillez vérifier votre connexion.',

        // Error messages
        'error_prefix': 'Erreur : ',
        'rate_limit_error': 'Limite de débit de l\'API OpenAI dépassée. Veuillez réessayer dans quelques minutes ou utilisez l\'onglet transcription pour lire directement.',
        'invalid_api_key': 'Votre clé API semble être invalide. Veuillez mettre à jour votre clé API OpenAI dans les paramètres.',
        'insufficient_quota': 'Votre compte OpenAI a un quota insuffisant. Veuillez vérifier vos détails de facturation sur openai.com.',
        'api_key_save_error': 'Erreur : {{error}}',
        'api_key_saved': 'Clé API sauvegardée avec succès',

        // AI responses
        'no_transcript_response': 'Désolé, mais je n\'ai pas pu accéder à la transcription de cette vidéo. Sans la transcription, je ne peux pas répondre aux questions sur le contenu de la vidéo.',
        'just_said_no_transcript': 'Désolé, mais je n\'ai pas pu accéder à la transcription de cette vidéo. Sans la transcription, je ne peux pas vous dire ce qui vient d\'être dit. Vous pourriez essayer d\'activer les sous-titres dans le lecteur YouTube.',
        'rate_limit_fallback': 'Je ne peux pas traiter votre question maintenant en raison des limites de débit de l\'API, mais voici une partie de la transcription pour cette section :',
        'try_again_later': 'Vous pouvez réessayer dans quelques minutes ou utiliser l\'onglet transcription pour lire directement.',
        'based_on_transcript': 'D\'après la transcription, voici ce qui vient d\'être dit :',
        'recent_transcript_unavailable': 'Je n\'ai pas pu trouver la transcription récente exacte autour du temps de lecture actuel. Vous pouvez consulter l\'onglet Transcription pour voir ce qui a été dit tout au long de la vidéo.',
        'no_transcript_captions': 'Je n\'ai pas pu accéder à la transcription pour vous dire ce qui vient d\'être dit. Vous pourriez essayer d\'activer les sous-titres dans le lecteur YouTube.',

        // Time format
        'timestamp_at': 'Horodatage à {{time}}',

        // General
        'unknown_video': 'Vidéo inconnue',
        'youtube_video': 'Vidéo YouTube'
      },

      de: {
        // Header and tabs
        'chat_tab': 'ChatBot',
        'transcript_tab': 'Transkript',
        'settings_tab': 'Einstellungen',
        'minimize_sidebar': 'Seitenleiste minimieren',
        'expand_sidebar': 'Seitenleiste erweitern',

        // Video info
        'loading_video': 'Wird geladen...',
        'now_playing': 'Jetzt läuft:',

        // Chat messages
        'welcome_message': 'Ich bin Ihr YouTube-Assistent. Fragen Sie mich alles über dieses Video!',
        'new_video_detected': 'Neues Video erkannt: "{{title}}"',
        'now_watching': 'Schaue jetzt: "{{title}}" - Stellen Sie mir Fragen zu diesem Video!',
        'transcript_loaded': 'Transkript geladen für: "{{title}}"',
        'no_transcript_video': 'Kein Transkript verfügbar für Video: "{{title}}"',
        'transcript_error': 'Transkript-Fehler: {{error}}',

        // API key section
        'api_key_prompt': 'Bitte geben Sie Ihren OpenAI API-Schlüssel ein, um den KI-Assistenten zu verwenden:',
        'api_key_placeholder': 'sk-...',
        'save_key': 'Speichern',
        'api_key_info': 'Ihr API-Schlüssel wird lokal gespeichert und nur für die Kommunikation mit OpenAI verwendet.',
        'api_ready': 'Bereit, Fragen zu diesem Video zu beantworten!',
        'change_key': 'Schlüssel ändern',
        'builtin_key_info': 'Diese Erweiterung verwendet einen eingebauten API-Schlüssel. Sie können sofort Fragen stellen!',
        'builtin_key_configured': 'Diese Erweiterung verwendet einen eingebauten API-Schlüssel. Keine Konfiguration erforderlich!',

        // Chat input
        'question_placeholder': 'Fragen Sie zu diesem Video...',

        // Transcript section
        'loading_transcript': 'Lade Transkript...',
        'no_transcript_available': 'Kein Transkript für dieses Video verfügbar.',
        'transcript_load_error': 'Fehler beim Laden des Transkripts: {{error}}',

        // Settings section
        'smart_pause_mode': 'Intelligenter Pausenmodus',
        'smart_pause_description': 'Pausiert automatisch das Video beim Tippen im Chat',
        'voice_input_mode': 'Spracheingabe Aktivieren',
        'voice_input_description': 'Stimme verwenden, um Fragen zum Video zu stellen',
        'voice_language_label': 'Spracherkennungssprache',
        'voice_language_description': 'Sprache für die Spracherkennung wählen',

        // Voice input
        'voice_listening': 'Hört zu...',
        'voice_start_listening': 'Spracheingabe starten',
        'voice_stop_listening': 'Aufhören zuzuhören',
        'voice_not_supported': 'Spracheingabe ist in diesem Browser nicht verfügbar. Bitte verwenden Sie einen Chromium-basierten Browser (Chrome, Edge, Brave).',
        'voice_error_generic': 'Spracherkennungsfehler aufgetreten. Bitte versuchen Sie es erneut.',
        'voice_error_permission': 'Mikrofon-Berechtigung verweigert. Bitte erlauben Sie Mikrofonzugriff und versuchen Sie es erneut.',
        'voice_error_no_speech': 'Keine Sprache erkannt. Bitte versuchen Sie erneut zu sprechen.',
        'voice_error_network': 'Netzwerkfehler während der Spracherkennung. Bitte überprüfen Sie Ihre Verbindung.',

        // Error messages
        'error_prefix': 'Fehler: ',
        'rate_limit_error': 'OpenAI API-Rate-Limit überschritten. Bitte versuchen Sie es in ein paar Minuten erneut oder verwenden Sie den Transkript-Tab zum direkten Lesen.',
        'invalid_api_key': 'Ihr API-Schlüssel scheint ungültig zu sein. Bitte aktualisieren Sie Ihren OpenAI API-Schlüssel in den Einstellungen.',
        'insufficient_quota': 'Ihr OpenAI-Konto hat unzureichendes Kontingent. Bitte überprüfen Sie Ihre Abrechnungsdetails auf openai.com.',
        'api_key_save_error': 'Fehler: {{error}}',
        'api_key_saved': 'API-Schlüssel erfolgreich gespeichert',

        // AI responses
        'no_transcript_response': 'Es tut mir leid, aber ich konnte nicht auf das Transkript dieses Videos zugreifen. Ohne das Transkript kann ich keine Fragen zum Videoinhalt beantworten.',
        'just_said_no_transcript': 'Es tut mir leid, aber ich konnte nicht auf das Transkript dieses Videos zugreifen. Ohne das Transkript kann ich Ihnen nicht sagen, was gerade gesagt wurde. Sie könnten versuchen, Untertitel im YouTube-Player zu aktivieren.',
        'rate_limit_fallback': 'Ich kann Ihre Frage gerade aufgrund von API-Rate-Limits nicht verarbeiten, aber hier ist ein Teil des Transkripts für diesen Abschnitt:',
        'try_again_later': 'Sie können es in ein paar Minuten erneut versuchen oder den Transkript-Tab zum direkten Lesen verwenden.',
        'based_on_transcript': 'Basierend auf dem Transkript ist das, was gerade gesagt wurde:',
        'recent_transcript_unavailable': 'Ich konnte das genaue aktuelle Transkript um die aktuelle Wiedergabezeit nicht finden. Sie können den Transkript-Tab überprüfen, um zu sehen, was während des Videos gesagt wurde.',
        'no_transcript_captions': 'Ich konnte nicht auf das Transkript zugreifen, um Ihnen zu sagen, was gerade gesagt wurde. Sie könnten versuchen, Untertitel im YouTube-Player zu aktivieren.',

        // Time format
        'timestamp_at': 'Zeitstempel bei {{time}}',

        // General
        'unknown_video': 'Unbekanntes Video',
        'youtube_video': 'YouTube-Video'
      },

      it: {
        // Header and tabs
        'chat_tab': 'ChatBot',
        'transcript_tab': 'Trascrizione',
        'settings_tab': 'Impostazioni',
        'minimize_sidebar': 'Riduci barra laterale',
        'expand_sidebar': 'Espandi barra laterale',

        // Video info
        'loading_video': 'Caricamento...',
        'now_playing': 'In riproduzione:',

        // Chat messages
        'welcome_message': 'Sono il tuo assistente YouTube. Chiedimi qualsiasi cosa su questo video!',
        'new_video_detected': 'Nuovo video rilevato: "{{title}}"',
        'now_watching': 'Guardando ora: "{{title}}" - Fammi qualsiasi domanda su questo video!',
        'transcript_loaded': 'Trascrizione caricata per: "{{title}}"',
        'no_transcript_video': 'Nessuna trascrizione disponibile per il video: "{{title}}"',
        'transcript_error': 'Errore trascrizione: {{error}}',

        // API key section
        'api_key_prompt': 'Inserisci la tua chiave API OpenAI per usare l\'assistente IA:',
        'api_key_placeholder': 'sk-...',
        'save_key': 'Salva',
        'api_key_info': 'La tua chiave API è memorizzata localmente e usata solo per comunicare con OpenAI.',
        'api_ready': 'Pronto a rispondere alle domande su questo video!',
        'change_key': 'Cambia chiave',
        'builtin_key_info': 'Questa estensione usa una chiave API integrata. Puoi fare domande subito!',
        'builtin_key_configured': 'Questa estensione usa una chiave API integrata. Nessuna configurazione necessaria!',

        // Chat input
        'question_placeholder': 'Chiedi di questo video...',

        // Transcript section
        'loading_transcript': 'Caricamento trascrizione...',
        'no_transcript_available': 'Nessuna trascrizione disponibile per questo video.',
        'transcript_load_error': 'Errore caricamento trascrizione: {{error}}',

        // Settings section
        'smart_pause_mode': 'Modalità Pausa Intelligente',
        'smart_pause_description': 'Mette automaticamente in pausa il video quando si digita nella chat',
        'voice_input_mode': 'Abilita Input Vocale',
        'voice_input_description': 'Usa la voce per fare domande sul video',
        'voice_language_label': 'Lingua Riconoscimento Vocale',
        'voice_language_description': 'Scegli la lingua per il riconoscimento vocale',

        // Voice input
        'voice_listening': 'In ascolto...',
        'voice_start_listening': 'Avvia input vocale',
        'voice_stop_listening': 'Smetti di ascoltare',
        'voice_not_supported': 'L\'input vocale non è disponibile in questo browser. Si prega di utilizzare un browser basato su Chromium (Chrome, Edge, Brave).',
        'voice_error_generic': 'Si è verificato un errore di riconoscimento vocale. Riprova.',
        'voice_error_permission': 'Permesso microfono negato. Consenti l\'accesso al microfono e riprova.',
        'voice_error_no_speech': 'Nessuna voce rilevata. Prova a parlare di nuovo.',
        'voice_error_network': 'Errore di rete durante il riconoscimento vocale. Controlla la connessione.',

        // Error messages
        'error_prefix': 'Errore: ',
        'rate_limit_error': 'Limite di velocità API OpenAI superato. Riprova tra qualche minuto o usa la scheda trascrizione per leggere direttamente.',
        'invalid_api_key': 'La tua chiave API sembra non valida. Aggiorna la tua chiave API OpenAI nelle impostazioni.',
        'insufficient_quota': 'Il tuo account OpenAI ha quota insufficiente. Controlla i dettagli di fatturazione su openai.com.',
        'api_key_save_error': 'Errore: {{error}}',
        'api_key_saved': 'Chiave API salvata con successo',

        // AI responses
        'no_transcript_response': 'Mi dispiace, ma non sono riuscito ad accedere alla trascrizione di questo video. Senza la trascrizione, non posso rispondere a domande sul contenuto del video.',
        'just_said_no_transcript': 'Mi dispiace, ma non sono riuscito ad accedere alla trascrizione di questo video. Senza la trascrizione, non posso dirti cosa è stato appena detto. Potresti provare ad abilitare i sottotitoli nel lettore YouTube.',
        'rate_limit_fallback': 'Non posso elaborare la tua domanda ora a causa dei limiti di velocità API, ma ecco parte della trascrizione per questa sezione:',
        'try_again_later': 'Puoi riprovare tra qualche minuto o usare la scheda trascrizione per leggere direttamente.',
        'based_on_transcript': 'Basandomi sulla trascrizione, questo è quello che è stato appena detto:',
        'recent_transcript_unavailable': 'Non sono riuscito a trovare la trascrizione recente esatta intorno al tempo di riproduzione attuale. Puoi controllare la scheda Trascrizione per vedere cosa è stato detto durante il video.',
        'no_transcript_captions': 'Non sono riuscito ad accedere alla trascrizione per dirti cosa è stato appena detto. Potresti provare ad abilitare i sottotitoli nel lettore YouTube.',

        // Time format
        'timestamp_at': 'Timestamp a {{time}}',

        // General
        'unknown_video': 'Video sconosciuto',
        'youtube_video': 'Video YouTube'
      },

      pt: {
        // Header and tabs
        'chat_tab': 'ChatBot',
        'transcript_tab': 'Transcrição',
        'settings_tab': 'Configurações',
        'minimize_sidebar': 'Minimizar barra lateral',
        'expand_sidebar': 'Expandir barra lateral',

        // Video info
        'loading_video': 'Carregando...',
        'now_playing': 'Reproduzindo agora:',

        // Chat messages
        'welcome_message': 'Sou seu assistente do YouTube. Pergunte-me qualquer coisa sobre este vídeo!',
        'new_video_detected': 'Novo vídeo detectado: "{{title}}"',
        'now_watching': 'Assistindo agora: "{{title}}" - Faça-me qualquer pergunta sobre este vídeo!',
        'transcript_loaded': 'Transcrição carregada para: "{{title}}"',
        'no_transcript_video': 'Nenhuma transcrição disponível para o vídeo: "{{title}}"',
        'transcript_error': 'Erro de transcrição: {{error}}',

        // API key section
        'api_key_prompt': 'Por favor, insira sua chave API do OpenAI para usar o assistente de IA:',
        'api_key_placeholder': 'sk-...',
        'save_key': 'Salvar',
        'api_key_info': 'Sua chave API é armazenada localmente e usada apenas para se comunicar com o OpenAI.',
        'api_ready': 'Pronto para responder perguntas sobre este vídeo!',
        'change_key': 'Alterar chave',
        'builtin_key_info': 'Esta extensão usa uma chave API integrada. Você pode fazer perguntas imediatamente!',
        'builtin_key_configured': 'Esta extensão usa uma chave API integrada. Nenhuma configuração necessária!',

        // Chat input
        'question_placeholder': 'Pergunte sobre este vídeo...',

        // Transcript section
        'loading_transcript': 'Carregando transcrição...',
        'no_transcript_available': 'Nenhuma transcrição disponível para este vídeo.',
        'transcript_load_error': 'Erro ao carregar transcrição: {{error}}',

        // Settings section
        'smart_pause_mode': 'Modo Pausa Inteligente',
        'smart_pause_description': 'Pausa automaticamente o vídeo ao digitar no chat',

        // Error messages
        'error_prefix': 'Erro: ',
        'rate_limit_error': 'Limite de taxa da API OpenAI excedido. Tente novamente em alguns minutos ou use a aba transcrição para ler diretamente.',
        'invalid_api_key': 'Sua chave API parece ser inválida. Atualize sua chave API do OpenAI nas configurações.',
        'insufficient_quota': 'Sua conta OpenAI tem cota insuficiente. Verifique os detalhes de cobrança em openai.com.',
        'api_key_save_error': 'Erro: {{error}}',
        'api_key_saved': 'Chave API salva com sucesso',

        // AI responses
        'no_transcript_response': 'Desculpe, mas não consegui acessar a transcrição deste vídeo. Sem a transcrição, não posso responder perguntas sobre o conteúdo do vídeo.',
        'just_said_no_transcript': 'Desculpe, mas não consegui acessar a transcrição deste vídeo. Sem a transcrição, não posso dizer o que acabou de ser dito. Você pode tentar habilitar as legendas no player do YouTube.',
        'rate_limit_fallback': 'Não posso processar sua pergunta agora devido aos limites de taxa da API, mas aqui está parte da transcrição para esta seção:',
        'try_again_later': 'Você pode tentar novamente em alguns minutos ou usar a aba transcrição para ler diretamente.',
        'based_on_transcript': 'Baseado na transcrição, isto é o que acabou de ser dito:',
        'recent_transcript_unavailable': 'Não consegui encontrar a transcrição recente exata em torno do tempo de reprodução atual. Você pode verificar a aba Transcrição para ver o que foi dito ao longo do vídeo.',
        'no_transcript_captions': 'Não consegui acessar a transcrição para dizer o que acabou de ser dito. Você pode tentar habilitar as legendas no player do YouTube.',

        // Time format
        'timestamp_at': 'Timestamp em {{time}}',

        // General
        'unknown_video': 'Vídeo desconhecido',
        'youtube_video': 'Vídeo do YouTube'
      },

      ru: {
        // Header and tabs
        'chat_tab': 'Чат-бот',
        'transcript_tab': 'Транскрипция',
        'settings_tab': 'Настройки',
        'minimize_sidebar': 'Свернуть боковую панель',
        'expand_sidebar': 'Развернуть боковую панель',

        // Video info
        'loading_video': 'Загрузка...',
        'now_playing': 'Сейчас воспроизводится:',

        // Chat messages
        'welcome_message': 'Я ваш помощник YouTube. Спрашивайте меня о чём угодно касательно этого видео!',
        'new_video_detected': 'Обнаружено новое видео: "{{title}}"',
        'now_watching': 'Сейчас смотрим: "{{title}}" - Задавайте мне любые вопросы об этом видео!',
        'transcript_loaded': 'Транскрипция загружена для: "{{title}}"',
        'no_transcript_video': 'Транскрипция недоступна для видео: "{{title}}"',
        'transcript_error': 'Ошибка транскрипции: {{error}}',

        // API key section
        'api_key_prompt': 'Пожалуйста, введите ваш API-ключ OpenAI для использования ИИ-помощника:',
        'api_key_placeholder': 'sk-...',
        'save_key': 'Сохранить',
        'api_key_info': 'Ваш API-ключ хранится локально и используется только для связи с OpenAI.',
        'api_ready': 'Готов отвечать на вопросы об этом видео!',
        'change_key': 'Изменить ключ',
        'builtin_key_info': 'Это расширение использует встроенный API-ключ. Вы можете сразу задавать вопросы!',
        'builtin_key_configured': 'Это расширение использует встроенный API-ключ. Настройка не требуется!',

        // Chat input
        'question_placeholder': 'Спросите об этом видео...',

        // Transcript section
        'loading_transcript': 'Загрузка транскрипции...',
        'no_transcript_available': 'Транскрипция недоступна для этого видео.',
        'transcript_load_error': 'Ошибка загрузки транскрипции: {{error}}',

        // Settings section
        'smart_pause_mode': 'Умная пауза',
        'smart_pause_description': 'Автоматически ставит видео на паузу при наборе текста в чате',

        // Error messages
        'error_prefix': 'Ошибка: ',
        'rate_limit_error': 'Превышен лимит скорости API OpenAI. Попробуйте снова через несколько минут или используйте вкладку транскрипции для прямого чтения.',
        'invalid_api_key': 'Ваш API-ключ кажется недействительным. Обновите ваш API-ключ OpenAI в настройках.',
        'insufficient_quota': 'У вашего аккаунта OpenAI недостаточная квота. Проверьте данные о платежах на openai.com.',
        'api_key_save_error': 'Ошибка: {{error}}',
        'api_key_saved': 'API-ключ успешно сохранён',

        // AI responses
        'no_transcript_response': 'Извините, но я не смог получить доступ к транскрипции этого видео. Без транскрипции я не могу отвечать на вопросы о содержании видео.',
        'just_said_no_transcript': 'Извините, но я не смог получить доступ к транскрипции этого видео. Без транскрипции я не могу сказать, что только что было сказано. Вы можете попробовать включить субтитры в плеере YouTube.',
        'rate_limit_fallback': 'Я не могу обработать ваш вопрос сейчас из-за ограничений скорости API, но вот часть транскрипции для этого раздела:',
        'try_again_later': 'Вы можете попробовать снова через несколько минут или использовать вкладку транскрипции для прямого чтения.',
        'based_on_transcript': 'Основываясь на транскрипции, вот что только что было сказано:',
        'recent_transcript_unavailable': 'Я не смог найти точную недавнюю транскрипцию вокруг текущего времени воспроизведения. Вы можете проверить вкладку Транскрипция, чтобы увидеть, что было сказано в течение видео.',
        'no_transcript_captions': 'Я не смог получить доступ к транскрипции, чтобы сказать, что только что было сказано. Вы можете попробовать включить субтитры в плеере YouTube.',

        // Time format
        'timestamp_at': 'Временная метка в {{time}}',

        // General
        'unknown_video': 'Неизвестное видео',
        'youtube_video': 'Видео YouTube'
      },

      zh: {
        // Header and tabs
        'chat_tab': '聊天机器人',
        'transcript_tab': '转录',
        'settings_tab': '设置',
        'minimize_sidebar': '最小化侧边栏',
        'expand_sidebar': '展开侧边栏',

        // Video info
        'loading_video': '加载中...',
        'now_playing': '正在播放：',

        // Chat messages
        'welcome_message': '我是您的YouTube助手。请问我关于这个视频的任何问题！',
        'new_video_detected': '检测到新视频："{{title}}"',
        'now_watching': '正在观看："{{title}}" - 请问我关于这个视频的任何问题！',
        'transcript_loaded': '已为"{{title}}"加载转录',
        'no_transcript_video': '视频"{{title}}"没有可用的转录',
        'transcript_error': '转录错误：{{error}}',

        // API key section
        'api_key_prompt': '请输入您的OpenAI API密钥以使用AI助手：',
        'api_key_placeholder': 'sk-...',
        'save_key': '保存',
        'api_key_info': '您的API密钥存储在本地，仅用于与OpenAI通信。',
        'api_ready': '准备回答关于这个视频的问题！',
        'change_key': '更改密钥',
        'builtin_key_info': '此扩展使用内置API密钥。您可以立即提问！',
        'builtin_key_configured': '此扩展使用内置API密钥。无需配置！',

        // Chat input
        'question_placeholder': '询问关于这个视频...',

        // Transcript section
        'loading_transcript': '正在加载转录...',
        'no_transcript_available': '此视频没有可用的转录。',
        'transcript_load_error': '加载转录时出错：{{error}}',

        // Settings section
        'smart_pause_mode': '智能暂停模式',
        'smart_pause_description': '在聊天中输入时自动暂停视频',

        // Error messages
        'error_prefix': '错误：',
        'rate_limit_error': 'OpenAI API速率限制已超出。请几分钟后重试或使用转录标签直接阅读。',
        'invalid_api_key': '您的API密钥似乎无效。请在设置中更新您的OpenAI API密钥。',
        'insufficient_quota': '您的OpenAI账户配额不足。请在openai.com检查您的账单详情。',
        'api_key_save_error': '错误：{{error}}',
        'api_key_saved': 'API密钥保存成功',

        // AI responses
        'no_transcript_response': '抱歉，我无法访问此视频的转录。没有转录，我无法回答有关视频内容的问题。',
        'just_said_no_transcript': '抱歉，我无法访问此视频的转录。没有转录，我无法告诉您刚才说了什么。您可以尝试在YouTube播放器中启用字幕。',
        'rate_limit_fallback': '由于API速率限制，我现在无法处理您的问题，但这里是此部分的部分转录：',
        'try_again_later': '您可以几分钟后重试或使用转录标签直接阅读。',
        'based_on_transcript': '根据转录，刚才说的是：',
        'recent_transcript_unavailable': '我无法找到当前播放时间附近的确切最近转录。您可以查看转录标签以查看整个视频中说了什么。',
        'no_transcript_captions': '我无法访问转录来告诉您刚才说了什么。您可以尝试在YouTube播放器中启用字幕。',

        // Time format
        'timestamp_at': '时间戳在{{time}}',

        // General
        'unknown_video': '未知视频',
        'youtube_video': 'YouTube视频'
      },

      ja: {
        // Header and tabs
        'chat_tab': 'チャットボット',
        'transcript_tab': '転写',
        'settings_tab': '設定',
        'minimize_sidebar': 'サイドバーを最小化',
        'expand_sidebar': 'サイドバーを展開',

        // Video info
        'loading_video': '読み込み中...',
        'now_playing': '再生中：',

        // Chat messages
        'welcome_message': '私はあなたのYouTubeアシスタントです。この動画について何でも聞いてください！',
        'new_video_detected': '新しい動画が検出されました：「{{title}}」',
        'now_watching': '視聴中：「{{title}}」 - この動画について何でも質問してください！',
        'transcript_loaded': '「{{title}}」の転写が読み込まれました',
        'no_transcript_video': '動画「{{title}}」の転写は利用できません',
        'transcript_error': '転写エラー：{{error}}',

        // API key section
        'api_key_prompt': 'AIアシスタントを使用するために、OpenAI APIキーを入力してください：',
        'api_key_placeholder': 'sk-...',
        'save_key': '保存',
        'api_key_info': 'あなたのAPIキーはローカルに保存され、OpenAIとの通信にのみ使用されます。',
        'api_ready': 'この動画について質問に答える準備ができました！',
        'change_key': 'キーを変更',
        'builtin_key_info': 'この拡張機能は組み込みAPIキーを使用します。すぐに質問できます！',
        'builtin_key_configured': 'この拡張機能は組み込みAPIキーを使用します。設定は不要です！',

        // Chat input
        'question_placeholder': 'この動画について質問...',

        // Transcript section
        'loading_transcript': '転写を読み込み中...',
        'no_transcript_available': 'この動画の転写は利用できません。',
        'transcript_load_error': '転写の読み込みエラー：{{error}}',

        // Settings section
        'smart_pause_mode': 'スマートポーズモード',
        'smart_pause_description': 'チャットで入力中に動画を自動的に一時停止',

        // Error messages
        'error_prefix': 'エラー：',
        'rate_limit_error': 'OpenAI APIレート制限を超過しました。数分後に再試行するか、転写タブを使用して直接読んでください。',
        'invalid_api_key': 'あなたのAPIキーは無効のようです。設定でOpenAI APIキーを更新してください。',
        'insufficient_quota': 'あなたのOpenAIアカウントのクォータが不足しています。openai.comで請求詳細を確認してください。',
        'api_key_save_error': 'エラー：{{error}}',
        'api_key_saved': 'APIキーが正常に保存されました',

        // AI responses
        'no_transcript_response': '申し訳ありませんが、この動画の転写にアクセスできませんでした。転写がないと、動画コンテンツについての質問に答えることができません。',
        'just_said_no_transcript': '申し訳ありませんが、この動画の転写にアクセスできませんでした。転写がないと、何が言われたばかりかお伝えできません。YouTubeプレーヤーで字幕を有効にしてみてください。',
        'rate_limit_fallback': 'APIレート制限のため現在あなたの質問を処理できませんが、このセクションの転写の一部をここに示します：',
        'try_again_later': '数分後に再試行するか、転写タブを使用して直接読むことができます。',
        'based_on_transcript': '転写に基づいて、先ほど言われたのは：',
        'recent_transcript_unavailable': '現在の再生時間周辺の正確な最近の転写を見つけることができませんでした。転写タブをチェックして、動画全体で何が言われたかを確認できます。',
        'no_transcript_captions': '何が言われたばかりかお伝えするために転写にアクセスできませんでした。YouTubeプレーヤーで字幕を有効にしてみてください。',

        // Time format
        'timestamp_at': '{{time}}のタイムスタンプ',

        // General
        'unknown_video': '不明な動画',
        'youtube_video': 'YouTube動画'
      },

      ko: {
        // Header and tabs
        'chat_tab': '챗봇',
        'transcript_tab': '전사',
        'settings_tab': '설정',
        'minimize_sidebar': '사이드바 최소화',
        'expand_sidebar': '사이드바 확장',

        // Video info
        'loading_video': '로딩 중...',
        'now_playing': '재생 중:',

        // Chat messages
        'welcome_message': '저는 당신의 YouTube 어시스턴트입니다. 이 비디오에 대해 무엇이든 물어보세요!',
        'new_video_detected': '새 비디오가 감지되었습니다: "{{title}}"',
        'now_watching': '시청 중: "{{title}}" - 이 비디오에 대해 무엇이든 질문하세요!',
        'transcript_loaded': '"{{title}}"에 대한 전사가 로드되었습니다',
        'no_transcript_video': '비디오 "{{title}}"에 사용 가능한 전사가 없습니다',
        'transcript_error': '전사 오류: {{error}}',

        // API key section
        'api_key_prompt': 'AI 어시스턴트를 사용하려면 OpenAI API 키를 입력하세요:',
        'api_key_placeholder': 'sk-...',
        'save_key': '저장',
        'api_key_info': '당신의 API 키는 로컬에 저장되며 OpenAI와의 통신에만 사용됩니다.',
        'api_ready': '이 비디오에 대한 질문에 답할 준비가 되었습니다!',
        'change_key': '키 변경',
        'builtin_key_info': '이 확장 프로그램은 내장 API 키를 사용합니다. 즉시 질문할 수 있습니다!',
        'builtin_key_configured': '이 확장 프로그램은 내장 API 키를 사용합니다. 구성이 필요하지 않습니다!',

        // Chat input
        'question_placeholder': '이 비디오에 대해 질문...',

        // Transcript section
        'loading_transcript': '전사 로딩 중...',
        'no_transcript_available': '이 비디오에 사용 가능한 전사가 없습니다.',
        'transcript_load_error': '전사 로딩 오류: {{error}}',

        // Settings section
        'smart_pause_mode': '스마트 일시정지 모드',
        'smart_pause_description': '채팅 입력 시 비디오를 자동으로 일시정지',

        // Error messages
        'error_prefix': '오류: ',
        'rate_limit_error': 'OpenAI API 속도 제한을 초과했습니다. 몇 분 후에 다시 시도하거나 전사 탭을 사용하여 직접 읽어보세요.',
        'invalid_api_key': '당신의 API 키가 유효하지 않은 것 같습니다. 설정에서 OpenAI API 키를 업데이트하세요.',
        'insufficient_quota': '당신의 OpenAI 계정의 할당량이 부족합니다. openai.com에서 청구 세부 정보를 확인하세요.',
        'api_key_save_error': '오류: {{error}}',
        'api_key_saved': 'API 키가 성공적으로 저장되었습니다',

        // AI responses
        'no_transcript_response': '죄송하지만 이 비디오의 전사에 접근할 수 없었습니다. 전사 없이는 비디오 콘텐츠에 대한 질문에 답할 수 없습니다.',
        'just_said_no_transcript': '죄송하지만 이 비디오의 전사에 접근할 수 없었습니다. 전사 없이는 방금 말한 내용을 알려드릴 수 없습니다. YouTube 플레이어에서 자막을 활성화해 보세요.',
        'rate_limit_fallback': 'API 속도 제한으로 인해 현재 질문을 처리할 수 없지만, 이 섹션의 전사 일부를 여기에 보여드립니다:',
        'try_again_later': '몇 분 후에 다시 시도하거나 전사 탭을 사용하여 직접 읽을 수 있습니다.',
        'based_on_transcript': '전사를 바탕으로, 방금 말한 내용은:',
        'recent_transcript_unavailable': '현재 재생 시간 주변의 정확한 최근 전사를 찾을 수 없었습니다. 전사 탭을 확인하여 비디오 전체에서 무엇이 말해졌는지 볼 수 있습니다.',
        'no_transcript_captions': '방금 말한 내용을 알려드리기 위해 전사에 접근할 수 없었습니다. YouTube 플레이어에서 자막을 활성화해 보세요.',

        // Time format
        'timestamp_at': '{{time}}의 타임스탬프',

        // General
        'unknown_video': '알 수 없는 비디오',
        'youtube_video': 'YouTube 비디오'
      },

      ar: {
        // Header and tabs
        'chat_tab': 'الشات بوت',
        'transcript_tab': 'النسخة المكتوبة',
        'settings_tab': 'الإعدادات',
        'minimize_sidebar': 'تصغير الشريط الجانبي',
        'expand_sidebar': 'توسيع الشريط الجانبي',

        // Video info
        'loading_video': 'جارٍ التحميل...',
        'now_playing': 'يتم تشغيله الآن:',

        // Chat messages
        'welcome_message': 'أنا مساعدك على يوتيوب. اسألني أي شيء عن هذا الفيديو!',
        'new_video_detected': 'تم اكتشاف فيديو جديد: "{{title}}"',
        'now_watching': 'تشاهد الآن: "{{title}}" - اسألني أي أسئلة عن هذا الفيديو!',
        'transcript_loaded': 'تم تحميل النسخة المكتوبة لـ: "{{title}}"',
        'no_transcript_video': 'لا توجد نسخة مكتوبة متاحة للفيديو: "{{title}}"',
        'transcript_error': 'خطأ في النسخة المكتوبة: {{error}}',

        // API key section
        'api_key_prompt': 'يرجى إدخال مفتاح OpenAI API الخاص بك لاستخدام المساعد الذكي:',
        'api_key_placeholder': 'sk-...',
        'save_key': 'حفظ',
        'api_key_info': 'يتم تخزين مفتاح API الخاص بك محليًا ويُستخدم فقط للتواصل مع OpenAI.',
        'api_ready': 'جاهز للإجابة على الأسئلة حول هذا الفيديو!',
        'change_key': 'تغيير المفتاح',
        'builtin_key_info': 'هذا الامتداد يستخدم مفتاح API مدمج. يمكنك طرح الأسئلة فورًا!',
        'builtin_key_configured': 'هذا الامتداد يستخدم مفتاح API مدمج. لا حاجة للتكوين!',

        // Chat input
        'question_placeholder': 'اسأل عن هذا الفيديو...',

        // Transcript section
        'loading_transcript': 'جارٍ تحميل النسخة المكتوبة...',
        'no_transcript_available': 'لا توجد نسخة مكتوبة متاحة لهذا الفيديو.',
        'transcript_load_error': 'خطأ في تحميل النسخة المكتوبة: {{error}}',

        // Settings section
        'smart_pause_mode': 'وضع الإيقاف الذكي',
        'smart_pause_description': 'يوقف الفيديو تلقائياً عند الكتابة في الدردشة',

        // Error messages
        'error_prefix': 'خطأ: ',
        'rate_limit_error': 'تم تجاوز حد معدل OpenAI API. يرجى المحاولة مرة أخرى بعد بضع دقائق أو استخدام تبويب النسخة المكتوبة للقراءة مباشرة.',
        'invalid_api_key': 'يبدو أن مفتاح API الخاص بك غير صحيح. يرجى تحديث مفتاح OpenAI API في الإعدادات.',
        'insufficient_quota': 'حساب OpenAI الخاص بك له حصة غير كافية. يرجى فحص تفاصيل الفوترة على openai.com.',
        'api_key_save_error': 'خطأ: {{error}}',
        'api_key_saved': 'تم حفظ مفتاح API بنجاح',

        // AI responses
        'no_transcript_response': 'آسف, لكنني لم أستطع الوصول إلى النسخة المكتوبة لهذا الفيديو. بدون النسخة المكتوبة, لا يمكنني الإجابة على أسئلة حول محتوى الفيديو.',
        'just_said_no_transcript': 'آسف, لكنني لم أستطع الوصول إلى النسخة المكتوبة لهذا الفيديو. بدون النسخة المكتوبة, لا يمكنني إخبارك بما قيل للتو. يمكنك محاولة تفعيل الترجمة في مشغل يوتيوب.',
        'rate_limit_fallback': 'لا يمكنني معالجة سؤالك الآن بسبب حدود معدل API, لكن إليك جزء من النسخة المكتوبة لهذا القسم:',
        'try_again_later': 'يمكنك المحاولة مرة أخرى بعد بضع دقائق أو استخدام تبويب النسخة المكتوبة للقراءة مباشرة.',
        'based_on_transcript': 'بناءً على النسخة المكتوبة, هذا ما قيل للتو:',
        'recent_transcript_unavailable': 'لم أستطع العثور على النسخة المكتوبة الحديثة الدقيقة حول وقت التشغيل الحالي. يمكنك فحص تبويب النسخة المكتوبة لرؤية ما قيل خلال الفيديو.',
        'no_transcript_captions': 'لم أستطع الوصول إلى النسخة المكتوبة لإخبارك بما قيل للتو. يمكنك محاولة تفعيل الترجمة في مشغل يوتيوب.',

        // Time format
        'timestamp_at': 'الطابع الزمني في {{time}}',

        // General
        'unknown_video': 'فيديو غير معروف',
        'youtube_video': 'فيديو يوتيوب'
      },

      hi: {
        // Header and tabs
        'chat_tab': 'चैटबॉट',
        'transcript_tab': 'ट्रांसक्रिप्ट',
        'settings_tab': 'सेटिंग्स',
        'minimize_sidebar': 'साइडबार छोटा करें',
        'expand_sidebar': 'साइडबार बड़ा करें',

        // Video info
        'loading_video': 'लोड हो रहा है...',
        'now_playing': 'अब चल रहा है:',

        // Chat messages
        'welcome_message': 'मैं आपका YouTube सहायक हूं। इस वीडियो के बारे में मुझसे कुछ भी पूछें!',
        'new_video_detected': 'नया वीडियो पाया गया: "{{title}}"',
        'now_watching': 'अब देख रहे हैं: "{{title}}" - इस वीडियो के बारे में मुझसे कोई भी सवाल पूछें!',
        'transcript_loaded': '"{{title}}" के लिए ट्रांसक्रिप्ट लोड हुआ',
        'no_transcript_video': 'वीडियो "{{title}}" के लिए कोई ट्रांसक्रिप्ट उपलब्ध नहीं',
        'transcript_error': 'ट्रांसक्रिप्ट त्रुटि: {{error}}',

        // API key section
        'api_key_prompt': 'AI सहायक का उपयोग करने के लिए कृपया अपनी OpenAI API कुंजी दर्ज करें:',
        'api_key_placeholder': 'sk-...',
        'save_key': 'सेव करें',
        'api_key_info': 'आपकी API कुंजी स्थानीय रूप से संग्रहीत है और केवल OpenAI के साथ संवाद के लिए उपयोग की जाती है।',
        'api_ready': 'इस वीडियो के बारे में सवालों का जवाब देने के लिए तैयार!',
        'change_key': 'कुंजी बदलें',
        'builtin_key_info': 'यह एक्सटेंशन बिल्ट-इन API कुंजी का उपयोग करता है। आप तुरंत सवाल पूछ सकते हैं!',
        'builtin_key_configured': 'यह एक्सटेंशन बिल्ट-इन API कुंजी का उपयोग करता है। कोई कॉन्फ़िगरेशन आवश्यक नहीं!',

        // Chat input
        'question_placeholder': 'इस वीडियो के बारे में पूछें...',

        // Transcript section
        'loading_transcript': 'ट्रांसक्रिप्ट लोड हो रहा है...',
        'no_transcript_available': 'इस वीडियो के लिए कोई ट्रांसक्रिप्ट उपलब्ध नहीं है।',
        'transcript_load_error': 'ट्रांसक्रिप्ट लोडिंग त्रुटि: {{error}}',

        // Settings section
        'smart_pause_mode': 'स्मार्ट पॉज़ मोड',
        'smart_pause_description': 'चैट में टाइप करते समय वीडियो को स्वचालित रूप से रोक देता है',

        // Error messages
        'error_prefix': 'त्रुटि: ',
        'rate_limit_error': 'OpenAI API दर सीमा पार हो गई। कृपया कुछ मिनट बाद फिर कोशिश करें या सीधे पढ़ने के लिए ट्रांसक्रिप्ट टैब का उपयोग करें।',
        'invalid_api_key': 'आपकी API कुंजी अमान्य लगती है। कृपया सेटिंग्स में अपनी OpenAI API कुंजी अपडेट करें।',
        'insufficient_quota': 'आपके OpenAI खाते में अपर्याप्त कोटा है। कृपया openai.com पर बिलिंग विवरण की जांच करें।',
        'api_key_save_error': 'त्रुटि: {{error}}',
        'api_key_saved': 'API कुंजी सफलतापूर्वक सेव हुई',

        // AI responses
        'no_transcript_response': 'खुशी है, लेकिन मैं इस वीडियो के ट्रांसक्रिप्ट तक नहीं पहुंच सका। ट्रांसक्रिप्ट के बिना, मैं वीडियो सामग्री के बारे में सवालों का जवाब नहीं दे सकता।',
        'just_said_no_transcript': 'खुशी है, लेकिन मैं इस वीडियो के ट्रांसक्रिप्ट तक नहीं पहुंच सका। ट्रांसक्रिप्ट के बिना, मैं आपको बता नहीं सकता कि अभी क्या कहा गया। आप YouTube प्लेयर में कैप्शन सक्षम करने की कोशिश कर सकते हैं।',
        'rate_limit_fallback': 'API दर सीमा के कारण मैं अभी आपके सवाल को प्रोसेस नहीं कर सकता, लेकिन यहां इस सेक्शन के ट्रांसक्रिप्ट का हिस्सा है:',
        'try_again_later': 'आप कुछ मिनट बाद फिर कोशिश कर सकते हैं या सीधे पढ़ने के लिए ट्रांसक्रिप्ट टैब का उपयोग कर सकते हैं।',
        'based_on_transcript': 'ट्रांसक्रिप्ट के आधार पर, अभी यह कहा गया था:',
        'recent_transcript_unavailable': 'मैं वर्तमान प्लेबैक समय के आसपास सटीक हालिया ट्रांसक्रिप्ट नहीं ढूंढ सका। आप ट्रांसक्रिप्ट टैब की जांच कर सकते हैं कि वीडियो के दौरान क्या कहा गया था।',
        'no_transcript_captions': 'मैं ट्रांसक्रिप्ट तक नहीं पहुंच सका कि आपको बताऊं कि अभी क्या कहा गया। आप YouTube प्लेयर में कैप्शन सक्षम करने की कोशिश कर सकते हैं।',

        // Time format
        'timestamp_at': '{{time}} पर टाइमस्टैम्प',

        // General
        'unknown_video': 'अज्ञात वीडियो',
        'youtube_video': 'YouTube वीडियो'
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
