import { useState, useEffect, useCallback, useRef } from 'react';
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
  Clock,
  Route,
  Volume2,
  VolumeX,
  Play,
  Square,
  Target,
  Locate,
  Navigation2
} from 'lucide-react';
import { useVibration } from '@/hooks/useVibration';
import { toast } from 'sonner';

interface NavigationProps {
  locationData?: {
    latitude: number;
    longitude: number;
    speed: number | null;
  };
  onRideStart?: () => void;
  onRideStop?: () => void;
}

interface NavigationStep {
  id: number;
  instruction: string;
  direction: 'straight' | 'left' | 'right' | 'uturn' | 'destination';
  distance: number; // in meters
  distanceText: string;
  hazard?: string;
  ecoTip?: string;
  lat: number;
  lng: number;
}

interface RouteInfo {
  totalDistance: string;
  estimatedTime: string;
  ecoScore: number;
  hazards: number;
  steps: NavigationStep[];
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
}

const Navigation = ({ locationData, onRideStart, onRideStop }: NavigationProps) => {
  const [destination, setDestination] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [distanceToNextStep, setDistanceToNextStep] = useState<number | null>(null);
  const [totalDistanceTraveled, setTotalDistanceTraveled] = useState(0);
  const [startLocation, setStartLocation] = useState<{ lat: number; lng: number } | null>(null);
  const lastSpokenStepRef = useRef<number>(-1);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const voiceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { patterns } = useVibration();

  // Calculate distance between two GPS points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Generate route based on destination (simulated but based on real current location)
  const generateRoute = useCallback((dest: string, currentLat: number, currentLng: number): RouteInfo => {
    // Generate waypoints based on current location
    const stepDistance = 0.002; // ~200m per step
    const steps: NavigationStep[] = [
      {
        id: 1,
        instruction: `${dest} की तरफ सीधे जाएं`,
        direction: 'straight',
        distance: 500,
        distanceText: '500 मीटर',
        ecoTip: 'स्थिर गति बनाए रखें - ईंधन बचाएं',
        lat: currentLat + stepDistance,
        lng: currentLng
      },
      {
        id: 2,
        instruction: 'बाएं मुड़ें',
        direction: 'left',
        distance: 200,
        distanceText: '200 मीटर',
        hazard: 'व्यस्त चौराहा - सावधान रहें',
        lat: currentLat + stepDistance,
        lng: currentLng - stepDistance
      },
      {
        id: 3,
        instruction: 'सीधे चलते रहें',
        direction: 'straight',
        distance: 1000,
        distanceText: '1 किलोमीटर',
        ecoTip: 'इंजन ब्रेकिंग का उपयोग करें',
        lat: currentLat + stepDistance * 3,
        lng: currentLng - stepDistance
      },
      {
        id: 4,
        instruction: 'दाएं मुड़ें',
        direction: 'right',
        distance: 300,
        distanceText: '300 मीटर',
        hazard: 'स्कूल ज़ोन - धीमी गति',
        lat: currentLat + stepDistance * 3,
        lng: currentLng
      },
      {
        id: 5,
        instruction: `${dest} - आप अपनी मंज़िल पर पहुंच गए!`,
        direction: 'destination',
        distance: 0,
        distanceText: '0 मीटर',
        lat: currentLat + stepDistance * 4,
        lng: currentLng + stepDistance
      }
    ];

    return {
      totalDistance: '2.0 km',
      estimatedTime: '8 मिनट',
      ecoScore: 85,
      hazards: 2,
      steps,
      startLocation: { lat: currentLat, lng: currentLng },
      endLocation: { lat: steps[steps.length - 1].lat, lng: steps[steps.length - 1].lng }
    };
  }, []);

  const speakInstruction = useCallback((text: string, force: boolean = false) => {
    if (!voiceEnabled && !force) return;
    
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
      speakInstruction('कृपया मंज़िल दर्ज करें', true);
      return;
    }

    if (!locationData) {
      toast.error('GPS सिग्नल की प्रतीक्षा करें');
      speakInstruction('GPS सिग्नल की प्रतीक्षा करें', true);
      return;
    }

    const route = generateRoute(destination, locationData.latitude, locationData.longitude);
    setRouteInfo(route);
    setIsNavigating(true);
    setCurrentStep(0);
    setTotalDistanceTraveled(0);
    setStartLocation({ lat: locationData.latitude, lng: locationData.longitude });
    lastSpokenStepRef.current = -1;
    lastLocationRef.current = { lat: locationData.latitude, lng: locationData.longitude };
    
    // Announce start
    const startMsg = `नेविगेशन शुरू। आपकी वर्तमान स्थिति से ${destination} तक। कुल दूरी ${route.totalDistance}, अनुमानित समय ${route.estimatedTime}। ${route.steps[0].instruction}`;
    speakInstruction(startMsg, true);
    patterns.tap();
    toast.success('नेविगेशन शुरू! Voice Assistant auto-started');
    
    // Trigger ride start callback (auto-start voice assistant)
    onRideStart?.();

    // Start continuous voice updates
    startVoiceUpdates();
  };

  const startVoiceUpdates = () => {
    // Clear any existing interval
    if (voiceIntervalRef.current) {
      clearInterval(voiceIntervalRef.current);
    }

    // Update every 10 seconds with current status
    voiceIntervalRef.current = setInterval(() => {
      if (!isNavigating || !locationData || !routeInfo) return;

      const speed = locationData.speed ? Math.round(locationData.speed * 3.6) : 0;
      const currentStepData = routeInfo.steps[currentStep];
      
      if (currentStepData && distanceToNextStep !== null) {
        if (distanceToNextStep > 100) {
          // Far from next step
          const statusMsg = `${Math.round(distanceToNextStep)} मीटर में ${currentStepData.instruction}। वर्तमान गति ${speed} किलोमीटर प्रति घंटा।`;
          speakInstruction(statusMsg);
        } else if (distanceToNextStep <= 100 && distanceToNextStep > 30) {
          // Approaching next step
          speakInstruction(`${Math.round(distanceToNextStep)} मीटर में ${currentStepData.instruction}। तैयार रहें!`);
          patterns.warning();
        }
      }
    }, 10000);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setRouteInfo(null);
    setCurrentStep(0);
    setDistanceToNextStep(null);
    setTotalDistanceTraveled(0);
    window.speechSynthesis.cancel();
    
    if (voiceIntervalRef.current) {
      clearInterval(voiceIntervalRef.current);
      voiceIntervalRef.current = null;
    }
    
    toast.info('नेविगेशन बंद');
    speakInstruction('नेविगेशन बंद', true);
    onRideStop?.();
  };

  // Live location tracking and step advancement
  useEffect(() => {
    if (!isNavigating || !locationData || !routeInfo) return;

    const currentStepData = routeInfo.steps[currentStep];
    if (!currentStepData) return;

    // Calculate distance to current step target
    const distance = calculateDistance(
      locationData.latitude,
      locationData.longitude,
      currentStepData.lat,
      currentStepData.lng
    );
    setDistanceToNextStep(distance);

    // Track distance traveled
    if (lastLocationRef.current) {
      const traveled = calculateDistance(
        lastLocationRef.current.lat,
        lastLocationRef.current.lng,
        locationData.latitude,
        locationData.longitude
      );
      if (traveled > 1) { // Only update if moved more than 1 meter
        setTotalDistanceTraveled(prev => prev + traveled);
        lastLocationRef.current = { lat: locationData.latitude, lng: locationData.longitude };
      }
    }

    // Check if reached current step (within 30 meters)
    if (distance < 30 && currentStep < routeInfo.steps.length - 1) {
      // Advance to next step
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      const nextStepData = routeInfo.steps[nextStep];
      
      // Speak new instruction only once
      if (lastSpokenStepRef.current !== nextStep) {
        lastSpokenStepRef.current = nextStep;
        
        let announcement = nextStepData.instruction;
        
        if (nextStepData.hazard) {
          patterns.warning();
          announcement += `। चेतावनी: ${nextStepData.hazard}`;
        }
        
        if (nextStepData.ecoTip) {
          announcement += `। इको टिप: ${nextStepData.ecoTip}`;
        }
        
        speakInstruction(announcement, true);
        patterns.tap();
      }
    }

    // Check if reached destination
    if (currentStep === routeInfo.steps.length - 1 && distance < 30) {
      speakInstruction('बधाई हो! आप अपनी मंज़िल पर पहुंच गए!', true);
      patterns.success();
      stopNavigation();
    }

  }, [locationData, isNavigating, routeInfo, currentStep]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
      }
    };
  }, []);

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'left': return <ArrowLeft className="w-8 h-8" />;
      case 'right': return <ArrowRight className="w-8 h-8" />;
      case 'uturn': return <RotateCcw className="w-8 h-8" />;
      case 'destination': return <Target className="w-8 h-8" />;
      default: return <ArrowUp className="w-8 h-8" />;
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
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
        {/* Current Location Display */}
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
          <Locate className="w-5 h-5 text-primary animate-pulse" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">वर्तमान स्थिति (Live)</p>
            {locationData ? (
              <p className="text-sm font-mono text-foreground">
                {locationData.latitude.toFixed(6)}°N, {locationData.longitude.toFixed(6)}°E
              </p>
            ) : (
              <p className="text-sm text-warning animate-pulse">GPS सिग्नल ढूंढ रहे हैं...</p>
            )}
          </div>
          {locationData?.speed && (
            <Badge className="bg-primary/20 text-primary">
              {Math.round(locationData.speed * 3.6)} km/h
            </Badge>
          )}
        </div>

        {/* Destination Input */}
        {!isNavigating && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="मंज़िल दर्ज करें (जहां जाना है)..."
                  className="pl-10 bg-muted/50 border-border"
                />
              </div>
              <Button 
                onClick={startNavigation} 
                className="bg-primary text-primary-foreground hover:bg-primary/80"
                disabled={!locationData}
              >
                <Play className="w-4 h-4 mr-2" />
                राइड शुरू
              </Button>
            </div>
            
            {/* Quick destinations */}
            <div className="flex flex-wrap gap-2">
              {['घर', 'ऑफिस', 'पेट्रोल पंप', 'अस्पताल', 'बाज़ार'].map((place) => (
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
            {/* Live Distance to Next Step */}
            <div className="bg-gradient-to-br from-primary/30 to-accent/30 rounded-xl p-6 text-center relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <Badge className="bg-background/80 text-foreground animate-pulse">
                  <Navigation2 className="w-3 h-3 mr-1" />
                  LIVE
                </Badge>
              </div>
              
              <div className="flex justify-center mb-3">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary neon-border animate-pulse">
                  {getDirectionIcon(routeInfo.steps[currentStep].direction)}
                </div>
              </div>
              
              {distanceToNextStep !== null && (
                <p className="text-3xl font-black text-primary mb-2">
                  {formatDistance(distanceToNextStep)}
                </p>
              )}
              
              <p className="text-lg font-bold text-foreground mb-1">
                {routeInfo.steps[currentStep].instruction}
              </p>
              
              <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {routeInfo.steps.length}
              </p>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-3 bg-muted/30 rounded-lg border border-primary/30">
                <p className="text-xs text-muted-foreground">तय की गई दूरी</p>
                <p className="text-lg font-bold text-primary">{formatDistance(totalDistanceTraveled)}</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg border border-secondary/30">
                <p className="text-xs text-muted-foreground">वर्तमान गति</p>
                <p className="text-lg font-bold text-secondary">
                  {locationData?.speed ? Math.round(locationData.speed * 3.6) : 0} km/h
                </p>
              </div>
            </div>

            {/* Hazard Warning */}
            {routeInfo.steps[currentStep].hazard && (
              <div className="flex items-center gap-3 p-3 bg-warning/20 rounded-lg border border-warning/50 animate-pulse">
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
                <p className="text-xs text-muted-foreground">कुल दूरी</p>
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
                      ? 'bg-primary/20 border-2 border-primary/50 scale-[1.02]' 
                      : idx < currentStep 
                        ? 'opacity-50 bg-muted/10' 
                        : 'bg-muted/20'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    idx === currentStep ? 'bg-primary text-primary-foreground animate-pulse' : 
                    idx < currentStep ? 'bg-muted text-muted-foreground' : 'bg-muted/50'
                  }`}>
                    {getDirectionIcon(step.direction)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-foreground line-clamp-1">{step.instruction}</p>
                    <p className="text-xs text-muted-foreground">{step.distanceText}</p>
                  </div>
                  {idx === currentStep && (
                    <Badge className="bg-primary text-primary-foreground text-xs">अभी</Badge>
                  )}
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
                onClick={() => {
                  const step = routeInfo.steps[currentStep];
                  speakInstruction(`${formatDistance(distanceToNextStep || 0)} में ${step.instruction}`, true);
                }}
                className="flex-1 border-border"
              >
                🔊 दोहराएं
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
