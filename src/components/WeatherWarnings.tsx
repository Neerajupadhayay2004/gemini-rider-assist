import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Eye, Thermometer, Droplets, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWeather } from '@/hooks/useWeather';
import { useVibration } from '@/hooks/useVibration';
import { useToast } from '@/hooks/use-toast';

interface WeatherWarningsProps {
  latitude?: number;
  longitude?: number;
}

const WeatherWarnings = ({ latitude, longitude }: WeatherWarningsProps) => {
  const { weather, loading, error, fetchWeather } = useWeather();
  const { patterns } = useVibration();
  const { toast } = useToast();
  const [lastWarned, setLastWarned] = useState<string[]>([]);

  useEffect(() => {
    if (latitude && longitude) {
      fetchWeather(latitude, longitude);
    }
  }, [latitude, longitude, fetchWeather]);

  // Vibrate and announce new warnings
  useEffect(() => {
    if (weather && weather.warnings.length > 0) {
      const newWarnings = weather.warnings.filter(w => !lastWarned.includes(w));
      
      if (newWarnings.length > 0) {
        if (weather.riskLevel === 'extreme') {
          patterns.danger();
        } else if (weather.riskLevel === 'high') {
          patterns.warning();
        } else if (weather.riskLevel === 'medium') {
          patterns.tap();
        }

        // Speak warnings
        if ('speechSynthesis' in window && newWarnings.length > 0) {
          const warningText = `Weather alert: ${newWarnings.join('. ')}`;
          const utterance = new SpeechSynthesisUtterance(warningText);
          window.speechSynthesis.speak(utterance);
        }

        toast({
          title: "Weather Warning",
          description: newWarnings[0],
          variant: weather.riskLevel === 'extreme' || weather.riskLevel === 'high' ? 'destructive' : 'default',
        });

        setLastWarned(weather.warnings);
      }
    }
  }, [weather]);

  const getWeatherIcon = () => {
    if (!weather) return <Cloud className="w-12 h-12 text-muted-foreground" />;
    
    if (weather.isStormy) return <CloudLightning className="w-12 h-12 text-yellow-400 animate-pulse" />;
    if (weather.isRaining) return <CloudRain className="w-12 h-12 text-blue-400" />;
    if (weather.isSlippery) return <CloudSnow className="w-12 h-12 text-blue-200" />;
    if (weather.isFoggy) return <Cloud className="w-12 h-12 text-gray-400" />;
    if (weather.condition === 'Clear') return <Sun className="w-12 h-12 text-yellow-400" />;
    return <Cloud className="w-12 h-12 text-gray-400" />;
  };

  const getRiskColor = () => {
    if (!weather) return 'text-muted-foreground';
    switch (weather.riskLevel) {
      case 'extreme': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  const getRiskBorder = () => {
    if (!weather) return '';
    switch (weather.riskLevel) {
      case 'extreme': return 'border-red-500/50';
      case 'high': return 'border-orange-500/50';
      case 'medium': return 'border-yellow-500/50';
      default: return 'border-green-500/50';
    }
  };

  if (!latitude || !longitude) {
    return (
      <Card className="glass-card p-6 neon-border">
        <div className="flex items-center gap-3 mb-4">
          <Cloud className="w-8 h-8 text-primary" />
          <h2 className="text-2xl font-bold gradient-text">Weather Conditions</h2>
        </div>
        <p className="text-muted-foreground text-center">
          Waiting for GPS location to fetch weather data...
        </p>
      </Card>
    );
  }

  return (
    <Card className={`glass-card p-6 neon-border ${getRiskBorder()}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getWeatherIcon()}
          <div>
            <h2 className="text-2xl font-bold gradient-text">Weather Conditions</h2>
            {weather && (
              <p className="text-sm text-muted-foreground capitalize">{weather.description}</p>
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fetchWeather(latitude, longitude)}
          disabled={loading}
          className="neon-border"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <div className="text-center text-destructive mb-4">
          <p>{error}</p>
        </div>
      )}

      {weather && (
        <>
          {/* Risk Level */}
          <div className={`text-center p-4 rounded-lg bg-background/30 mb-4 ${getRiskBorder()} border`}>
            <p className="text-sm text-muted-foreground mb-1">Riding Risk Level</p>
            <p className={`text-3xl font-black uppercase ${getRiskColor()}`}>
              {weather.riskLevel}
            </p>
          </div>

          {/* Weather Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-background/30 rounded-lg text-center">
              <Thermometer className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{weather.temperature.toFixed(1)}°C</p>
              <p className="text-xs text-muted-foreground">Temperature</p>
            </div>
            
            <div className="p-3 bg-background/30 rounded-lg text-center">
              <Droplets className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold">{weather.humidity}%</p>
              <p className="text-xs text-muted-foreground">Humidity</p>
            </div>
            
            <div className="p-3 bg-background/30 rounded-lg text-center">
              <Wind className="w-6 h-6 mx-auto mb-2 text-secondary" />
              <p className="text-2xl font-bold">{weather.windSpeed.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">km/h Wind</p>
            </div>
            
            <div className="p-3 bg-background/30 rounded-lg text-center">
              <Eye className="w-6 h-6 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">{weather.visibility.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">km Visibility</p>
            </div>
          </div>

          {/* Warnings */}
          {weather.warnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <p className="font-semibold text-warning">Active Warnings</p>
              </div>
              {weather.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm"
                >
                  {warning}
                </div>
              ))}
            </div>
          )}

          {weather.warnings.length === 0 && (
            <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
              <p className="text-green-500 font-semibold">✓ Good riding conditions</p>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default WeatherWarnings;
