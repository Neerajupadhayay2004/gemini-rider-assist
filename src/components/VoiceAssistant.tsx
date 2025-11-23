import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Volume2, VolumeX, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface VoiceAssistantProps {
  sensorData?: {
    acceleration: { x: number; y: number; z: number };
    gyroscope: { alpha: number; beta: number; gamma: number };
  };
  locationData?: {
    latitude: number;
    longitude: number;
    speed: number | null;
  };
}

const VoiceAssistant = ({ sensorData, locationData }: VoiceAssistantProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [isInitialized, setIsInitialized] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Language options
  const languages = [
    { code: 'en-US', name: 'English' },
    { code: 'hi-IN', name: 'हिंदी (Hindi)' },
    { code: 'es-ES', name: 'Español' },
    { code: 'fr-FR', name: 'Français' },
    { code: 'de-DE', name: 'Deutsch' },
    { code: 'pt-BR', name: 'Português' },
    { code: 'ja-JP', name: '日本語' },
    { code: 'zh-CN', name: '中文' },
    { code: 'ar-SA', name: 'العربية' },
  ];

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    try {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = language;
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onstart = () => {
          console.log('Speech recognition started');
          setIsListening(true);
        };

        recognitionRef.current.onresult = (event: any) => {
          console.log('Speech recognition result:', event);
          const current = event.resultIndex;
          const transcriptText = event.results[current][0].transcript;
          setTranscript(transcriptText);

          if (event.results[current].isFinal) {
            console.log('Final transcript:', transcriptText);
            handleVoiceInput(transcriptText);
            setTranscript('');
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          
          let errorMessage = 'Please try again';
          if (event.error === 'not-allowed') {
            errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
          } else if (event.error === 'no-speech') {
            errorMessage = 'No speech detected. Please speak clearly.';
          } else if (event.error === 'network') {
            errorMessage = 'Network error. Please check your internet connection.';
          }
          
          toast({
            title: "Voice Recognition Error",
            description: errorMessage,
            variant: "destructive",
          });
        };

        recognitionRef.current.onend = () => {
          console.log('Speech recognition ended');
          setIsListening(false);
        };

        setIsInitialized(true);
      } else {
        toast({
          title: "Not Supported",
          description: "Speech recognition is not supported in your browser. Please use Chrome or Edge.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      toast({
        title: "Initialization Error",
        description: "Failed to initialize voice recognition",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    initializeSpeechRecognition();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [language]);

  // Request microphone permission on mount
  useEffect(() => {
    const requestMicPermission = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted');
      } catch (error) {
        console.error('Microphone permission error:', error);
        toast({
          title: "Microphone Permission",
          description: "Please allow microphone access to use voice features",
          variant: "destructive",
        });
      }
    };
    
    requestMicPermission();
  }, []);

  const toggleListening = async () => {
    if (!isInitialized) {
      toast({
        title: "Not Ready",
        description: "Speech recognition is still initializing...",
      });
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
        setIsListening(false);
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    } else {
      try {
        recognitionRef.current?.start();
        toast({
          title: "Listening",
          description: "Speak now in " + languages.find(l => l.code === language)?.name,
        });
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast({
          title: "Error",
          description: "Failed to start listening. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleVoiceInput = async (text: string) => {
    console.log('Processing voice input:', text);
    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);

    // Create context with sensor and location data
    let contextInfo = '';
    if (sensorData) {
      const accelMag = Math.sqrt(
        sensorData.acceleration.x ** 2 + 
        sensorData.acceleration.y ** 2 + 
        sensorData.acceleration.z ** 2
      ).toFixed(2);
      contextInfo += `\nCurrent sensor data: Acceleration magnitude: ${accelMag} m/s², Gyroscope: α=${sensorData.gyroscope.alpha.toFixed(1)}°, β=${sensorData.gyroscope.beta.toFixed(1)}°, γ=${sensorData.gyroscope.gamma.toFixed(1)}°`;
    }
    if (locationData) {
      contextInfo += `\nCurrent location: ${locationData.latitude.toFixed(6)}°N, ${locationData.longitude.toFixed(6)}°E`;
      if (locationData.speed !== null) {
        contextInfo += `, Speed: ${(locationData.speed * 3.6).toFixed(1)} km/h`;
      }
    }

    const enhancedMessage = text + contextInfo;

    try {
      console.log('Calling Gemini API...');
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: { 
          messages: [...messages.map(m => ({
            role: m.role,
            content: m.content
          })), { role: 'user', content: enhancedMessage }],
          stream: false
        }
      });

      console.log('Gemini response:', data, 'Error:', error);

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.response 
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Speak the response
      speakText(data.response);

    } catch (error) {
      console.error('Error calling Gemini:', error);
      toast({
        title: "AI Error",
        description: error instanceof Error ? error.message : "Failed to get response from AI assistant",
        variant: "destructive",
      });
      
      // Fallback response
      const fallbackMsg = "I'm having trouble connecting to the AI service. Please check your internet connection.";
      setMessages(prev => [...prev, { role: 'assistant', content: fallbackMsg }]);
      speakText(fallbackMsg);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to match voice to selected language
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(voice => voice.lang.startsWith(language.split('-')[0]));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
      
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = language;
      
      utterance.onstart = () => {
        console.log('Speech synthesis started');
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        console.log('Speech synthesis ended');
        setIsSpeaking(false);
      };
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.error('Speech synthesis not supported');
      toast({
        title: "Not Supported",
        description: "Text-to-speech is not supported in your browser",
        variant: "destructive",
      });
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Announce location updates
  useEffect(() => {
    if (locationData && messages.length === 0) {
      const locationMsg = `GPS active. Current location: ${locationData.latitude.toFixed(4)} degrees north, ${locationData.longitude.toFixed(4)} degrees east.`;
      speakText(locationMsg);
    }
  }, [locationData]);

  const changeLanguage = (newLang: string) => {
    setLanguage(newLang);
    if (recognitionRef.current) {
      recognitionRef.current.lang = newLang;
    }
    toast({
      title: "Language Changed",
      description: `Now using ${languages.find(l => l.code === newLang)?.name}`,
    });
  };

  return (
    <Card className="glass-card p-6 neon-border">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <h2 className="text-2xl font-bold gradient-text">RiderGuard AI</h2>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <Select value={language} onValueChange={changeLanguage}>
              <SelectTrigger className="w-[150px] neon-border">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isSpeaking && (
            <Button
              variant="outline"
              size="icon"
              onClick={stopSpeaking}
              className="neon-border"
            >
              <VolumeX className="w-5 h-5 text-secondary" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg ${
              msg.role === 'user'
                ? 'bg-primary/20 ml-8'
                : 'bg-secondary/20 mr-8'
            }`}
          >
            <p className="text-sm font-semibold mb-1">
              {msg.role === 'user' ? 'You' : 'RiderGuard AI'}
            </p>
            <p className="text-foreground">{msg.content}</p>
          </div>
        ))}
        
        {transcript && (
          <div className="p-4 rounded-lg bg-primary/10 ml-8 border-2 border-primary animate-pulse">
            <p className="text-sm font-semibold mb-1">You (speaking...)</p>
            <p className="text-muted-foreground italic">{transcript}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 flex-col">
        <Button
          size="lg"
          onClick={toggleListening}
          disabled={!isInitialized}
          className={`${
            isListening
              ? 'bg-secondary hover:bg-secondary/90'
              : 'bg-primary hover:bg-primary/90'
          } neon-border glow-pulse w-20 h-20 rounded-full transition-all`}
        >
          {isListening ? (
            <MicOff className="w-8 h-8 animate-pulse" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </Button>
        
        {!isInitialized && (
          <p className="text-sm text-muted-foreground">Initializing voice recognition...</p>
        )}
      </div>

      {isListening && (
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm text-primary">Listening...</span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default VoiceAssistant;
