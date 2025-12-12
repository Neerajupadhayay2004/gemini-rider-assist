import { useState, useEffect } from 'react';
import { Shield, Zap, Brain } from 'lucide-react';
import SensorDisplay from '@/components/SensorDisplay';
import LocationTracker from '@/components/LocationTracker';
import VoiceAssistant from '@/components/VoiceAssistant';
import EmergencySOS from '@/components/EmergencySOS';
import WeatherWarnings from '@/components/WeatherWarnings';
import AdvancedAIFeatures from '@/components/AdvancedAIFeatures';
import OfflineIndicator from '@/components/OfflineIndicator';
import { useWeather } from '@/hooks/useWeather';

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
  const { weather, fetchWeather } = useWeather();

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
    <div className="min-h-screen bg-background relative overflow-hidden">
      <OfflineIndicator />
      
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <header className="text-center space-y-6 py-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Shield className="w-16 h-16 text-primary float-animation" />
            <h1 className="text-5xl md:text-7xl font-black gradient-text">RiderGuard AI</h1>
          </div>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Advanced Collision Prevention & Rider Assistance System
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
            <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full neon-border">
              <Brain className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold">AI-Powered</span>
            </div>
            <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full neon-border">
              <Zap className="w-5 h-5 text-secondary" />
              <span className="text-sm font-semibold">Real-Time</span>
            </div>
            <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full neon-border">
              <Shield className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold">Offline Ready</span>
            </div>
          </div>
        </header>

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

        {/* Weather & AI Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          <WeatherWarnings 
            latitude={locationData?.latitude} 
            longitude={locationData?.longitude} 
          />
          <AdvancedAIFeatures sensorData={sensorData} locationData={locationData} />
        </div>

        {/* Location Tracker */}
        <div className="max-w-4xl mx-auto">
          <LocationTracker />
        </div>

        {/* Sensor Display */}
        <div>
          <h2 className="text-3xl font-bold text-center mb-6 gradient-text">Live Sensor Data</h2>
          <SensorDisplay />
        </div>
      </main>
    </div>
  );
};

export default Index;
