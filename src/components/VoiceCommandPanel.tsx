import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mic, 
  MicOff, 
  Volume2,
  Command,
  Home,
  Briefcase,
  Fuel,
  Hospital,
  MapPin,
  Square,
  Play,
  Languages,
  HelpCircle
} from 'lucide-react';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { toast } from 'sonner';

interface VoiceCommandPanelProps {
  language?: string;
  onNavigateTo?: (destination: string) => void;
  onStartNavigation?: () => void;
  onStopNavigation?: () => void;
  locationData?: {
    latitude: number;
    longitude: number;
    speed: number | null;
  };
  weatherData?: {
    condition: string;
    temperature: number;
  };
}

const VoiceCommandPanel = ({
  language = 'en-US',
  onNavigateTo,
  onStartNavigation,
  onStopNavigation,
  locationData,
  weatherData
}: VoiceCommandPanelProps) => {
  const [showCommands, setShowCommands] = useState(false);

  const handleSpeedCheck = useCallback(() => {
    if (locationData?.speed !== null) {
      const speedKmh = (locationData?.speed || 0) * 3.6;
      const message = `Your current speed is ${speedKmh.toFixed(0)} kilometers per hour`;
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = language;
        window.speechSynthesis.speak(utterance);
      }
      toast.info(`Speed: ${speedKmh.toFixed(0)} km/h`);
    }
  }, [locationData, language]);

  const handleWeatherCheck = useCallback(() => {
    if (weatherData) {
      const message = `Current weather is ${weatherData.condition} with temperature ${weatherData.temperature.toFixed(0)} degrees`;
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = language;
        window.speechSynthesis.speak(utterance);
      }
      toast.info(`${weatherData.condition}, ${weatherData.temperature.toFixed(0)}°C`);
    }
  }, [weatherData, language]);

  const handleEmergency = useCallback(() => {
    // Trigger emergency action
    const sosButton = document.querySelector('[data-sos-trigger]') as HTMLButtonElement;
    if (sosButton) {
      sosButton.click();
    }
  }, []);

  const {
    isActive,
    lastCommand,
    toggleListening,
    availableCommands,
    speak
  } = useVoiceCommands({
    language,
    onNavigateTo,
    onStartNavigation,
    onStopNavigation,
    onSpeedCheck: handleSpeedCheck,
    onWeatherCheck: handleWeatherCheck,
    onEmergency: handleEmergency
  });

  const quickCommands = [
    { icon: <Home className="w-4 h-4" />, label: 'Home', command: 'Home' },
    { icon: <Briefcase className="w-4 h-4" />, label: 'Office', command: 'Office' },
    { icon: <Fuel className="w-4 h-4" />, label: 'Gas', command: 'Gas Station' },
    { icon: <Hospital className="w-4 h-4" />, label: 'Hospital', command: 'Hospital' },
  ];

  return (
    <Card className="glass-card neon-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Command className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Voice Commands</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <Badge variant="default" className="animate-pulse bg-primary">
                <Volume2 className="w-3 h-3 mr-1" />
                Listening
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCommands(!showCommands)}
              className="h-8 w-8"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Voice Button */}
        <div className="flex justify-center">
          <Button
            onClick={toggleListening}
            size="lg"
            className={`w-24 h-24 rounded-full transition-all ${
              isActive 
                ? 'bg-primary hover:bg-primary/90 animate-pulse shadow-lg shadow-primary/50' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {isActive ? (
              <MicOff className="w-10 h-10" />
            ) : (
              <Mic className="w-10 h-10" />
            )}
          </Button>
        </div>

        {/* Last Command */}
        {lastCommand && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Last command:</p>
            <p className="text-sm font-medium text-primary">"{lastCommand}"</p>
          </div>
        )}

        {/* Quick Navigation Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {quickCommands.map((cmd) => (
            <Button
              key={cmd.command}
              variant="outline"
              size="sm"
              onClick={() => {
                onNavigateTo?.(cmd.command);
                speak(`Navigating to ${cmd.command}`);
                toast.success(`Navigating to ${cmd.command}`);
              }}
              className="flex flex-col h-16 gap-1 neon-border"
            >
              {cmd.icon}
              <span className="text-xs">{cmd.label}</span>
            </Button>
          ))}
        </div>

        {/* Navigation Controls */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 neon-border"
            onClick={() => {
              onStartNavigation?.();
              speak('Navigation started');
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            Start
          </Button>
          <Button
            variant="outline"
            className="flex-1 neon-border"
            onClick={() => {
              onStopNavigation?.();
              speak('Navigation stopped');
            }}
          >
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
        </div>

        {/* Available Commands List */}
        {showCommands && (
          <div className="mt-4">
            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Languages className="w-4 h-4" />
              Say any of these:
            </p>
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {[
                  '"Navigate to [place]"',
                  '"Go home" / "Office"',
                  '"Start navigation"',
                  '"Stop navigation"',
                  '"What is my speed?"',
                  '"Check weather"',
                  '"Emergency" / "Help"',
                  '"Change language to Hindi"',
                  '"Gas station" / "Hospital"'
                ].map((cmd, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 text-primary" />
                    {cmd}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Hint */}
        <p className="text-xs text-center text-muted-foreground">
          {isActive 
            ? 'Speak a command like "Navigate to home" or "Stop navigation"'
            : 'Tap the microphone to enable voice commands'
          }
        </p>
      </CardContent>
    </Card>
  );
};

export default VoiceCommandPanel;
