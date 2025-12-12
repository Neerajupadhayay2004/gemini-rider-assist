import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Navigation as NavIcon, 
  MapPin, 
  ArrowUp, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw,
  AlertTriangle,
  Leaf,
  Zap,
  Clock,
  Route,
  Volume2,
  VolumeX,
  Play,
  Square,
  Target
} from 'lucide-react';
import { useVibration } from '@/hooks/useVibration';
import { toast } from 'sonner';

interface NavigationProps {
  locationData?: {
    latitude: number;
    longitude: number;
    speed: number | null;
  };
}

interface NavigationStep {
  id: number;
  instruction: string;
  direction: 'straight' | 'left' | 'right' | 'uturn' | 'destination';
  distance: string;
  hazard?: string;
  ecoTip?: string;
}

interface RouteInfo {
  totalDistance: string;
  estimatedTime: string;
  ecoScore: number;
  hazards: number;
  steps: NavigationStep[];
}

const Navigation = ({ locationData }: NavigationProps) => {
  const [destination, setDestination] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const { patterns } = useVibration();

  // Simulated route for demo (would be replaced with actual routing API)
  const generateRoute = useCallback((dest: string): RouteInfo => {
    const steps: NavigationStep[] = [
      {
        id: 1,
        instruction: `${dest} की तरफ 500 मीटर सीधे जाएं`,
        direction: 'straight',
        distance: '500m',
        ecoTip: 'स्थिर गति बनाए रखें - ईंधन बचाएं'
      },
      {
        id: 2,
        instruction: 'मुख्य चौराहे पर बाएं मुड़ें',
        direction: 'left',
        distance: '200m',
        hazard: 'व्यस्त चौराहा - सावधान रहें'
      },
      {
        id: 3,
        instruction: '1 किलोमीटर सीधे चलें',
        direction: 'straight',
        distance: '1km',
        ecoTip: 'इंजन ब्रेकिंग का उपयोग करें'
      },
      {
        id: 4,
        instruction: 'पेट्रोल पंप के पास दाएं मुड़ें',
        direction: 'right',
        distance: '300m',
        hazard: 'स्कूल ज़ोन - धीमी गति'
      },
      {
        id: 5,
        instruction: `${dest} - आप अपनी मंज़िल पर पहुंच गए`,
        direction: 'destination',
        distance: '0m'
      }
    ];

    return {
      totalDistance: '2.0 km',
      estimatedTime: '8 मिनट',
      ecoScore: 85,
      hazards: 2,
      steps
    };
  }, []);

  const speakInstruction = useCallback((text: string) => {
    if (!voiceEnabled) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang.includes('hi'));
    if (hindiVoice) utterance.voice = hindiVoice;
    
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const startNavigation = () => {
    if (!destination.trim()) {
      toast.error('कृपया मंज़िल दर्ज करें');
      return;
    }

    const route = generateRoute(destination);
    setRouteInfo(route);
    setIsNavigating(true);
    setCurrentStep(0);
    
    speakInstruction(`नेविगेशन शुरू। ${destination} तक ${route.totalDistance}, अनुमानित समय ${route.estimatedTime}`);
    patterns.tap();
    toast.success('नेविगेशन शुरू हो गया!');
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setRouteInfo(null);
    setCurrentStep(0);
    window.speechSynthesis.cancel();
    toast.info('नेविगेशन बंद');
  };

  const nextStep = () => {
    if (routeInfo && currentStep < routeInfo.steps.length - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      
      const step = routeInfo.steps[newStep];
      speakInstruction(step.instruction);
      
      if (step.hazard) {
        patterns.warning();
        setTimeout(() => speakInstruction(`चेतावनी: ${step.hazard}`), 2000);
      }
      
      if (step.ecoTip) {
        setTimeout(() => speakInstruction(`इको टिप: ${step.ecoTip}`), 4000);
      }
    }
  };

  // Auto-advance based on location changes
  useEffect(() => {
    if (isNavigating && locationData && routeInfo) {
      // Simulate step advancement based on movement
      const interval = setInterval(() => {
        if (currentStep < routeInfo.steps.length - 1) {
          // In real implementation, this would check actual distance to next waypoint
          // For demo, we advance based on speed
          if (locationData.speed && locationData.speed > 2) {
            nextStep();
          }
        } else {
          speakInstruction('आप अपनी मंज़िल पर पहुंच गए!');
          patterns.success();
          stopNavigation();
        }
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [isNavigating, locationData, currentStep, routeInfo]);

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'left': return <ArrowLeft className="w-8 h-8" />;
      case 'right': return <ArrowRight className="w-8 h-8" />;
      case 'uturn': return <RotateCcw className="w-8 h-8" />;
      case 'destination': return <Target className="w-8 h-8" />;
      default: return <ArrowUp className="w-8 h-8" />;
    }
  };

  return (
    <Card className="glass-card neon-border overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/20 to-accent/20">
        <CardTitle className="flex items-center gap-3 text-foreground">
          <NavIcon className="w-6 h-6 text-primary" />
          AI Navigation
          <Badge variant="outline" className="ml-auto bg-primary/20 text-primary border-primary">
            <Leaf className="w-3 h-3 mr-1" />
            Eco Mode
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Destination Input */}
        {!isNavigating && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="मंज़िल दर्ज करें..."
                  className="pl-10 bg-muted/50 border-border"
                />
              </div>
              <Button onClick={startNavigation} className="bg-primary text-primary-foreground hover:bg-primary/80">
                <Play className="w-4 h-4 mr-2" />
                शुरू करें
              </Button>
            </div>
            
            {/* Quick destinations */}
            <div className="flex flex-wrap gap-2">
              {['घर', 'ऑफिस', 'पेट्रोल पंप', 'अस्पताल'].map((place) => (
                <Button
                  key={place}
                  variant="outline"
                  size="sm"
                  onClick={() => setDestination(place)}
                  className="text-xs border-border hover:bg-muted"
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  {place}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Active Navigation */}
        {isNavigating && routeInfo && (
          <div className="space-y-4">
            {/* Current Direction */}
            <div className="bg-gradient-to-br from-primary/30 to-accent/30 rounded-xl p-6 text-center">
              <div className="flex justify-center mb-3">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary neon-border">
                  {getDirectionIcon(routeInfo.steps[currentStep].direction)}
                </div>
              </div>
              <p className="text-lg font-bold text-foreground mb-1">
                {routeInfo.steps[currentStep].instruction}
              </p>
              <p className="text-sm text-muted-foreground">
                {routeInfo.steps[currentStep].distance}
              </p>
            </div>

            {/* Hazard Warning */}
            {routeInfo.steps[currentStep].hazard && (
              <div className="flex items-center gap-3 p-3 bg-warning/20 rounded-lg border border-warning/50">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <span className="text-sm font-medium text-warning">
                  {routeInfo.steps[currentStep].hazard}
                </span>
              </div>
            )}

            {/* Eco Tip */}
            {routeInfo.steps[currentStep].ecoTip && (
              <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
                <Leaf className="w-5 h-5 text-primary" />
                <span className="text-sm text-primary">
                  {routeInfo.steps[currentStep].ecoTip}
                </span>
              </div>
            )}

            {/* Route Info */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <Route className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">दूरी</p>
                <p className="text-sm font-bold text-foreground">{routeInfo.totalDistance}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <Clock className="w-4 h-4 mx-auto text-secondary mb-1" />
                <p className="text-xs text-muted-foreground">समय</p>
                <p className="text-sm font-bold text-foreground">{routeInfo.estimatedTime}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <Leaf className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">इको</p>
                <p className="text-sm font-bold text-primary">{routeInfo.ecoScore}%</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 mx-auto text-warning mb-1" />
                <p className="text-xs text-muted-foreground">खतरे</p>
                <p className="text-sm font-bold text-warning">{routeInfo.hazards}</p>
              </div>
            </div>

            {/* Steps Preview */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {routeInfo.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    idx === currentStep 
                      ? 'bg-primary/20 border border-primary/50' 
                      : idx < currentStep 
                        ? 'opacity-50' 
                        : 'bg-muted/20'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    idx === currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {getDirectionIcon(step.direction)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-foreground line-clamp-1">{step.instruction}</p>
                    <p className="text-xs text-muted-foreground">{step.distance}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className="border-border"
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={nextStep}
                disabled={currentStep >= routeInfo.steps.length - 1}
                className="flex-1 border-border"
              >
                अगला कदम
              </Button>
              <Button
                variant="destructive"
                onClick={stopNavigation}
              >
                <Square className="w-4 h-4 mr-2" />
                रुकें
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Navigation;
