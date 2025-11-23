import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);

        if (event.results[current].isFinal) {
          handleVoiceInput(transcriptText);
          setTranscript('');
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Voice Recognition Error",
          description: "Please try again",
          variant: "destructive",
        });
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
      toast({
        title: "Listening",
        description: "Speak now...",
      });
    }
  };

  const handleVoiceInput = async (text: string) => {
    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);

    try {
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: { 
          messages: [...messages, userMessage],
          stream: false
        }
      });

      if (error) throw error;

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
        description: "Failed to get response from AI assistant",
        variant: "destructive",
      });
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <Card className="glass-card p-6 neon-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold gradient-text">RiderGuard AI</h2>
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

      <div className="flex items-center justify-center gap-4">
        <Button
          size="lg"
          onClick={toggleListening}
          className={`${
            isListening
              ? 'bg-secondary hover:bg-secondary/90'
              : 'bg-primary hover:bg-primary/90'
          } neon-border glow-pulse w-20 h-20 rounded-full`}
        >
          {isListening ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </Button>
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
