import { useCallback, useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useVibration } from './useVibration';

interface VoiceCommandsOptions {
  language?: string;
  onNavigateTo?: (destination: string) => void;
  onStartNavigation?: () => void;
  onStopNavigation?: () => void;
  onEmergency?: () => void;
  onSpeedCheck?: () => void;
  onWeatherCheck?: () => void;
  onChangeLanguage?: (lang: string) => void;
}

interface VoiceCommand {
  patterns: string[];
  action: () => void;
  description: string;
}

const translations: Record<string, Record<string, string>> = {
  'en-US': {
    listening: 'Listening for commands...',
    commandRecognized: 'Command recognized',
    navigatingTo: 'Navigating to',
    navigationStarted: 'Navigation started',
    navigationStopped: 'Navigation stopped',
    emergencyActivated: 'Emergency SOS activated',
    checkingSpeed: 'Checking your speed',
    checkingWeather: 'Checking weather conditions',
    languageChanged: 'Language changed to',
    unknownCommand: 'Command not recognized',
    voiceCommandsEnabled: 'Voice commands enabled',
    voiceCommandsDisabled: 'Voice commands disabled',
    sayCommand: 'Say a command like "navigate to home" or "stop navigation"',
    availableCommands: 'Available commands'
  },
  'hi-IN': {
    listening: 'कमांड सुन रहे हैं...',
    commandRecognized: 'कमांड पहचानी गई',
    navigatingTo: 'नेविगेट कर रहे हैं',
    navigationStarted: 'नेविगेशन शुरू',
    navigationStopped: 'नेविगेशन बंद',
    emergencyActivated: 'आपातकालीन SOS सक्रिय',
    checkingSpeed: 'गति जांच रहे हैं',
    checkingWeather: 'मौसम जांच रहे हैं',
    languageChanged: 'भाषा बदल गई',
    unknownCommand: 'कमांड नहीं पहचानी',
    voiceCommandsEnabled: 'वॉइस कमांड सक्षम',
    voiceCommandsDisabled: 'वॉइस कमांड अक्षम',
    sayCommand: '"घर जाओ" या "नेविगेशन बंद करो" जैसी कमांड बोलें',
    availableCommands: 'उपलब्ध कमांड'
  },
  'es-ES': {
    listening: 'Escuchando comandos...',
    commandRecognized: 'Comando reconocido',
    navigatingTo: 'Navegando a',
    navigationStarted: 'Navegación iniciada',
    navigationStopped: 'Navegación detenida',
    emergencyActivated: 'SOS de emergencia activado',
    checkingSpeed: 'Verificando velocidad',
    checkingWeather: 'Verificando clima',
    languageChanged: 'Idioma cambiado a',
    unknownCommand: 'Comando no reconocido',
    voiceCommandsEnabled: 'Comandos de voz habilitados',
    voiceCommandsDisabled: 'Comandos de voz deshabilitados',
    sayCommand: 'Diga un comando como "navegar a casa" o "detener navegación"',
    availableCommands: 'Comandos disponibles'
  }
};

export const useVoiceCommands = (options: VoiceCommandsOptions = {}) => {
  const { 
    language = 'en-US',
    onNavigateTo,
    onStartNavigation,
    onStopNavigation,
    onEmergency,
    onSpeedCheck,
    onWeatherCheck,
    onChangeLanguage
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const { patterns } = useVibration();

  const t = useCallback((key: string): string => {
    return translations[language]?.[key] || translations['en-US'][key] || key;
  }, [language]);

  // Define voice commands with patterns
  const getCommands = useCallback((): VoiceCommand[] => {
    return [
      // Navigation commands
      {
        patterns: [
          'navigate to', 'go to', 'take me to', 'directions to',
          'नेविगेट करो', 'जाओ', 'ले चलो', 'रास्ता बताओ',
          'navegar a', 'ir a', 'llévame a'
        ],
        action: () => {},
        description: 'Navigate to [destination]'
      },
      {
        patterns: [
          'start navigation', 'start ride', 'begin navigation', 'let\'s go',
          'नेविगेशन शुरू करो', 'राइड शुरू करो', 'चलो',
          'iniciar navegación', 'comenzar', 'vamos'
        ],
        action: () => {
          onStartNavigation?.();
          toast.success(t('navigationStarted'));
        },
        description: 'Start navigation'
      },
      {
        patterns: [
          'stop navigation', 'stop ride', 'end navigation', 'cancel',
          'नेविगेशन बंद करो', 'राइड बंद करो', 'रुको',
          'detener navegación', 'parar', 'cancelar'
        ],
        action: () => {
          onStopNavigation?.();
          toast.success(t('navigationStopped'));
        },
        description: 'Stop navigation'
      },
      // Emergency
      {
        patterns: [
          'emergency', 'help', 'sos', 'call for help',
          'आपातकाल', 'मदद', 'एसओएस', 'बचाओ',
          'emergencia', 'ayuda', 'socorro'
        ],
        action: () => {
          onEmergency?.();
          patterns.sos();
          toast.error(t('emergencyActivated'));
        },
        description: 'Emergency SOS'
      },
      // Speed check
      {
        patterns: [
          'what is my speed', 'check speed', 'how fast', 'speed',
          'मेरी गति क्या है', 'स्पीड चेक करो', 'कितनी तेज़',
          'cuál es mi velocidad', 'verificar velocidad', 'qué tan rápido'
        ],
        action: () => {
          onSpeedCheck?.();
          toast.info(t('checkingSpeed'));
        },
        description: 'Check current speed'
      },
      // Weather
      {
        patterns: [
          'what is the weather', 'check weather', 'weather conditions',
          'मौसम क्या है', 'मौसम बताओ', 'वेदर',
          'cuál es el clima', 'verificar clima', 'condiciones'
        ],
        action: () => {
          onWeatherCheck?.();
          toast.info(t('checkingWeather'));
        },
        description: 'Check weather'
      },
      // Language change
      {
        patterns: ['change language to english', 'english', 'speak english'],
        action: () => {
          onChangeLanguage?.('en-US');
          toast.success(`${t('languageChanged')} English`);
        },
        description: 'Change to English'
      },
      {
        patterns: ['change language to hindi', 'hindi', 'hindi mein bolo', 'हिंदी'],
        action: () => {
          onChangeLanguage?.('hi-IN');
          toast.success(`${t('languageChanged')} हिंदी`);
        },
        description: 'Change to Hindi'
      },
      {
        patterns: ['change language to spanish', 'spanish', 'español'],
        action: () => {
          onChangeLanguage?.('es-ES');
          toast.success(`${t('languageChanged')} Español`);
        },
        description: 'Change to Spanish'
      },
      // Quick destinations
      {
        patterns: ['home', 'go home', 'take me home', 'घर', 'घर ले चलो', 'casa', 'ir a casa'],
        action: () => {
          onNavigateTo?.('Home');
          toast.success(`${t('navigatingTo')} Home`);
        },
        description: 'Navigate home'
      },
      {
        patterns: ['office', 'work', 'go to office', 'ऑफिस', 'काम', 'oficina', 'trabajo'],
        action: () => {
          onNavigateTo?.('Office');
          toast.success(`${t('navigatingTo')} Office`);
        },
        description: 'Navigate to office'
      },
      {
        patterns: ['gas station', 'petrol pump', 'fuel', 'पेट्रोल पंप', 'ईंधन', 'gasolinera', 'combustible'],
        action: () => {
          onNavigateTo?.('Gas Station');
          toast.success(`${t('navigatingTo')} Gas Station`);
        },
        description: 'Navigate to gas station'
      },
      {
        patterns: ['hospital', 'clinic', 'medical', 'अस्पताल', 'hospital', 'clínica'],
        action: () => {
          onNavigateTo?.('Hospital');
          toast.success(`${t('navigatingTo')} Hospital`);
        },
        description: 'Navigate to hospital'
      }
    ];
  }, [onNavigateTo, onStartNavigation, onStopNavigation, onEmergency, onSpeedCheck, onWeatherCheck, onChangeLanguage, patterns, t]);

  // Process voice input
  const processCommand = useCallback((transcript: string) => {
    const lowerTranscript = transcript.toLowerCase().trim();
    setLastCommand(lowerTranscript);
    
    const commands = getCommands();
    
    // Check for "navigate to [destination]" pattern first
    const navigatePatterns = ['navigate to', 'go to', 'take me to', 'directions to', 'नेविगेट करो', 'ले चलो'];
    for (const pattern of navigatePatterns) {
      if (lowerTranscript.includes(pattern)) {
        const destination = lowerTranscript.split(pattern)[1]?.trim();
        if (destination) {
          patterns.tap();
          onNavigateTo?.(destination);
          toast.success(`${t('navigatingTo')} ${destination}`);
          return true;
        }
      }
    }

    // Check other commands
    for (const command of commands) {
      for (const pattern of command.patterns) {
        if (lowerTranscript.includes(pattern.toLowerCase())) {
          patterns.success();
          command.action();
          return true;
        }
      }
    }

    // No command matched
    patterns.warning();
    toast.warning(t('unknownCommand'), {
      description: t('sayCommand')
    });
    return false;
  }, [getCommands, onNavigateTo, patterns, t]);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return null;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = language;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript;
      console.log('Voice command received:', transcript);
      processCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Voice command error:', event.error);
      if (event.error !== 'no-speech') {
        toast.error('Voice command error', { description: event.error });
      }
    };

    recognition.onend = () => {
      // Restart if still active
      if (isActive && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log('Recognition restart failed:', e);
        }
      }
    };

    return recognition;
  }, [language, processCommand, isActive]);

  // Start listening
  const startListening = useCallback(() => {
    recognitionRef.current = initRecognition();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsActive(true);
        patterns.tap();
        toast.success(t('voiceCommandsEnabled'), {
          description: t('sayCommand')
        });
      } catch (error) {
        console.error('Failed to start voice commands:', error);
      }
    }
  }, [initRecognition, patterns, t]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsActive(false);
    toast.info(t('voiceCommandsDisabled'));
  }, [t]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isActive) {
      stopListening();
    } else {
      startListening();
    }
  }, [isActive, startListening, stopListening]);

  // Speak response
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, [language]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Update language in recognition
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
    }
  }, [language]);

  return {
    isActive,
    lastCommand,
    startListening,
    stopListening,
    toggleListening,
    processCommand,
    speak,
    availableCommands: getCommands().map(c => c.description)
  };
};
