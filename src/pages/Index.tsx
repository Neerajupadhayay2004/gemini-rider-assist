import { useState, useEffect, useRef } from 'react';
import { Shield, Zap, Brain, Leaf, TreePine, AlertTriangle, Gauge, Mic } from 'lucide-react';
import SensorDisplay from '@/components/SensorDisplay';
import LocationTracker from '@/components/LocationTracker';
import VoiceAssistant from '@/components/VoiceAssistant';
import EmergencySOS from '@/components/EmergencySOS';
import WeatherWarnings from '@/components/WeatherWarnings';
import AdvancedAIFeatures from '@/components/AdvancedAIFeatures';
import OfflineIndicator from '@/components/OfflineIndicator';
import Navigation from '@/components/Navigation';
import Dashboard from '@/components/Dashboard';
import LiveMap from '@/components/LiveMap';
import TrafficAlerts from '@/components/TrafficAlerts';
import SpeedLimitWarning from '@/components/SpeedLimitWarning';
import VoiceCommandPanel from '@/components/VoiceCommandPanel';
import { useWeather } from '@/hooks/useWeather';
import { toast } from 'sonner';

interface SensorData {
  acceleration: { x: number; y: number; z: number };
  gyroscope: { alpha: number; beta: number; gamma: number };
}

interface LocationData {
  latitude: number;
  longitude: number;
  speed: number | null;
}

const Index = () => {
  const [sensorData, setSensorData] = useState<SensorData | undefined>();
  const [locationData, setLocationData] = useState<LocationData | undefined>();
  const [isRideActive, setIsRideActive] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const voiceAssistantRef = useRef<{ startListening: () => void } | null>(null);
  const { weather, fetchWeather } = useWeather();

  // Auto-start voice assistant when ride starts
  const handleRideStart = () => {
    setIsRideActive(true);
    toast.success('Ride started! Voice Assistant active');
    
    // Auto welcome message in English
    const welcomeMsg = 'Ride started! I am your AI assistant. Have a safe journey.';
    const utterance = new SpeechSynthesisUtterance(welcomeMsg);
    utterance.lang = language;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleRideStop = () => {
    setIsRideActive(false);
  };

  const handleNavigateTo = (destination: string) => {
    toast.success(`Setting destination: ${destination}`);
    // Could integrate with Navigation component
  };

  useEffect(() => {
    const handleSensorUpdate = (data: SensorData) => setSensorData(data);
    const handleLocationUpdate = (data: LocationData) => {
      setLocationData(data);
      fetchWeather(data.latitude, data.longitude);
    };

    window.addEventListener('sensorUpdate' as any, (e: any) => handleSensorUpdate(e.detail));
    window.addEventListener('locationUpdate' as any, (e: any) => handleLocationUpdate(e.detail));

    return () => {
      window.removeEventListener('sensorUpdate' as any, handleSensorUpdate);
      window.removeEventListener('locationUpdate' as any, handleLocationUpdate);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden leaf-pattern">
      <OfflineIndicator />
      
      {/* Eco Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <header className="text-center space-y-6 py-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <TreePine className="w-12 h-12 text-primary float-animation" />
            <h1 className="text-4xl md:text-6xl font-black gradient-text">EcoRider AI</h1>
            <Leaf className="w-12 h-12 text-accent float-animation" style={{ animationDelay: '0.5s' }} />
          </div>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Eco-Friendly Navigation & Safety System
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full neon-border">
              <Brain className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold">AI-Powered</span>
            </div>
            <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full neon-border">
              <Leaf className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold">Eco-Friendly</span>
            </div>
            <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full neon-border">
              <Shield className="w-5 h-5 text-secondary" />
              <span className="text-sm font-semibold">Safe & Secure</span>
            </div>
            <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full neon-border">
              <Gauge className="w-5 h-5 text-warning" />
              <span className="text-sm font-semibold">Speed Limits</span>
            </div>
            <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full neon-border">
              <Mic className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold">Voice Commands</span>
            </div>
          </div>
        </header>

        {/* Navigation & Map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          <Navigation 
            locationData={locationData} 
            onRideStart={handleRideStart}
            onRideStop={handleRideStop}
          />
          <LiveMap locationData={locationData} isRideActive={isRideActive} />
        </div>

        {/* Speed Limit & Voice Commands */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          <SpeedLimitWarning 
            locationData={locationData} 
            language={language}
          />
          <VoiceCommandPanel
            language={language}
            onNavigateTo={handleNavigateTo}
            onStartNavigation={handleRideStart}
            onStopNavigation={handleRideStop}
            locationData={locationData}
            weatherData={weather ? {
              condition: weather.condition,
              temperature: weather.temperature
            } : undefined}
          />
        </div>

        {/* Dashboard */}
        <div className="max-w-6xl mx-auto">
          <Dashboard sensorData={sensorData} locationData={locationData} weatherData={weather ? {
            condition: weather.condition,
            temperature: weather.temperature
          } : undefined} />
        </div>

        {/* Voice Assistant */}
        <div className="max-w-4xl mx-auto">
          <VoiceAssistant 
            sensorData={sensorData} 
            locationData={locationData}
            weatherData={weather ? {
              condition: weather.condition,
              temperature: weather.temperature,
              riskLevel: weather.riskLevel,
              warnings: weather.warnings,
            } : undefined}
          />
        </div>

        {/* Emergency SOS */}
        <div className="max-w-4xl mx-auto">
          <EmergencySOS sensorData={sensorData} locationData={locationData} />
        </div>

        {/* Traffic Alerts & Weather */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          <TrafficAlerts 
            locationData={locationData} 
            weatherData={weather ? {
              condition: weather.condition,
              temperature: weather.temperature,
              humidity: 60,
              windSpeed: 10,
              visibility: 24000
            } : undefined}
          />
          <WeatherWarnings 
            latitude={locationData?.latitude} 
            longitude={locationData?.longitude} 
          />
        </div>

        {/* AI Analysis */}
        <div className="max-w-6xl mx-auto">
          <AdvancedAIFeatures sensorData={sensorData} locationData={locationData} />
        </div>

        {/* Location & Sensors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          <LocationTracker />
          <SensorDisplay />
        </div>
      </main>
    </div>
  );
};

export default Index;
