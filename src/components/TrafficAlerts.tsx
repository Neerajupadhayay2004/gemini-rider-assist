import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  Car,
  Construction,
  CloudRain,
  Snowflake,
  Wind,
  Eye,
  Timer,
  MapPin,
  Volume2,
  VolumeX,
  RefreshCw,
  TrafficCone,
  CircleAlert,
  Zap,
  Shield,
  Navigation
} from 'lucide-react';
import { useVibration } from '@/hooks/useVibration';
import { toast } from 'sonner';

interface TrafficAlertsProps {
  locationData?: {
    latitude: number;
    longitude: number;
    speed: number | null;
  };
  weatherData?: {
    condition: string;
    temperature: number;
    humidity?: number;
    windSpeed?: number;
    visibility?: number;
  };
}

interface TrafficAlert {
  id: string;
  type: 'accident' | 'construction' | 'congestion' | 'weather' | 'hazard' | 'police' | 'closure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  distance: number;
  direction: string;
  timestamp: Date;
  estimatedDelay: number;
  isActive: boolean;
}

interface RoadCondition {
  id: string;
  type: 'wet' | 'icy' | 'foggy' | 'windy' | 'clear' | 'poor_visibility' | 'flooded';
  severity: 'good' | 'moderate' | 'poor' | 'dangerous';
  description: string;
  affectedArea: string;
}

const TrafficAlerts = ({ locationData, weatherData }: TrafficAlertsProps) => {
  const [alerts, setAlerts] = useState<TrafficAlert[]>([]);
  const [roadConditions, setRoadConditions] = useState<RoadCondition[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { patterns } = useVibration();

  const getAlertIcon = (type: TrafficAlert['type']) => {
    switch (type) {
      case 'accident': return <Car className="w-4 h-4" />;
      case 'construction': return <Construction className="w-4 h-4" />;
      case 'congestion': return <TrafficCone className="w-4 h-4" />;
      case 'weather': return <CloudRain className="w-4 h-4" />;
      case 'hazard': return <AlertTriangle className="w-4 h-4" />;
      case 'police': return <Shield className="w-4 h-4" />;
      case 'closure': return <CircleAlert className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: TrafficAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground border-destructive';
      case 'high': return 'bg-destructive/80 text-destructive-foreground border-destructive/80';
      case 'medium': return 'bg-warning text-warning-foreground border-warning';
      case 'low': return 'bg-primary/50 text-primary-foreground border-primary/50';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getConditionIcon = (type: RoadCondition['type']) => {
    switch (type) {
      case 'wet': return <CloudRain className="w-4 h-4" />;
      case 'icy': return <Snowflake className="w-4 h-4" />;
      case 'foggy': return <Eye className="w-4 h-4" />;
      case 'windy': return <Wind className="w-4 h-4" />;
      case 'poor_visibility': return <Eye className="w-4 h-4" />;
      case 'flooded': return <CloudRain className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getConditionColor = (severity: RoadCondition['severity']) => {
    switch (severity) {
      case 'dangerous': return 'text-destructive';
      case 'poor': return 'text-warning';
      case 'moderate': return 'text-primary';
      case 'good': return 'text-secondary';
      default: return 'text-muted-foreground';
    }
  };

  const speakAlert = useCallback((text: string) => {
    if (!voiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const generateTrafficAlerts = useCallback((lat: number, lng: number): TrafficAlert[] => {
    const alertTypes: TrafficAlert['type'][] = ['accident', 'construction', 'congestion', 'weather', 'hazard', 'police', 'closure'];
    const directions = ['ahead', 'on your left', 'on your right', 'behind you', 'at next intersection'];
    const titles: Record<TrafficAlert['type'], string[]> = {
      accident: ['Minor collision reported', 'Vehicle breakdown', 'Multi-car accident', 'Fender bender'],
      construction: ['Road work ahead', 'Lane closure', 'Bridge repair', 'Utility work'],
      congestion: ['Heavy traffic', 'Slow moving traffic', 'Traffic jam', 'Rush hour delays'],
      weather: ['Rain affecting visibility', 'Strong winds', 'Fog warning', 'Slippery conditions'],
      hazard: ['Debris on road', 'Pothole reported', 'Animal crossing', 'Object on road'],
      police: ['Speed check ahead', 'Police activity', 'Traffic control', 'Security checkpoint'],
      closure: ['Road closed', 'Detour required', 'Lane blocked', 'Street closure']
    };

    const numAlerts = Math.floor(Math.random() * 4) + 1;
    const generatedAlerts: TrafficAlert[] = [];

    for (let i = 0; i < numAlerts; i++) {
      const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const severity: TrafficAlert['severity'] = ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as TrafficAlert['severity'];
      const titleOptions = titles[type];
      
      generatedAlerts.push({
        id: `alert-${Date.now()}-${i}`,
        type,
        severity,
        title: titleOptions[Math.floor(Math.random() * titleOptions.length)],
        description: `Reported ${Math.floor(Math.random() * 30) + 1} minutes ago`,
        distance: Math.round((Math.random() * 5 + 0.1) * 10) / 10,
        direction: directions[Math.floor(Math.random() * directions.length)],
        timestamp: new Date(),
        estimatedDelay: Math.floor(Math.random() * 20) + 2,
        isActive: true
      });
    }

    return generatedAlerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity] || a.distance - b.distance;
    });
  }, []);

  const generateRoadConditions = useCallback((weather?: TrafficAlertsProps['weatherData']): RoadCondition[] => {
    const conditions: RoadCondition[] = [];

    if (weather) {
      const { condition, temperature, windSpeed, visibility } = weather;

      if (condition.toLowerCase().includes('rain') || condition.toLowerCase().includes('drizzle')) {
        conditions.push({
          id: 'wet-road',
          type: 'wet',
          severity: 'moderate',
          description: 'Roads may be slippery due to rain',
          affectedArea: 'Current route'
        });
      }

      if (temperature < 4) {
        conditions.push({
          id: 'icy-road',
          type: 'icy',
          severity: 'dangerous',
          description: 'Risk of ice on roads - drive with caution',
          affectedArea: 'All roads in area'
        });
      }

      if (windSpeed && windSpeed > 40) {
        conditions.push({
          id: 'windy',
          type: 'windy',
          severity: 'poor',
          description: 'High winds may affect vehicle stability',
          affectedArea: 'Open roads and bridges'
        });
      }

      if (visibility && visibility < 1000) {
        conditions.push({
          id: 'fog',
          type: 'foggy',
          severity: 'poor',
          description: 'Reduced visibility - use fog lights',
          affectedArea: 'Local area'
        });
      }

      if (condition.toLowerCase().includes('fog') || condition.toLowerCase().includes('mist')) {
        conditions.push({
          id: 'poor-vis',
          type: 'poor_visibility',
          severity: 'moderate',
          description: 'Poor visibility conditions',
          affectedArea: 'Current location'
        });
      }
    }

    if (conditions.length === 0) {
      conditions.push({
        id: 'clear',
        type: 'clear',
        severity: 'good',
        description: 'Road conditions are good',
        affectedArea: 'Current route'
      });
    }

    return conditions;
  }, []);

  const refreshAlerts = useCallback(() => {
    if (!locationData) return;
    
    setIsRefreshing(true);
    
    setTimeout(() => {
      const newAlerts = generateTrafficAlerts(locationData.latitude, locationData.longitude);
      const newConditions = generateRoadConditions(weatherData);
      
      setAlerts(newAlerts);
      setRoadConditions(newConditions);
      setLastUpdate(new Date());
      setIsRefreshing(false);

      // Announce critical alerts
      const criticalAlerts = newAlerts.filter(a => a.severity === 'critical' || a.severity === 'high');
      if (criticalAlerts.length > 0 && voiceEnabled) {
        const alert = criticalAlerts[0];
        speakAlert(`Traffic alert: ${alert.title}, ${alert.distance} kilometers ${alert.direction}. Estimated delay: ${alert.estimatedDelay} minutes.`);
        patterns.warning();
        toast.warning(`${alert.title} - ${alert.distance}km ${alert.direction}`);
      }
    }, 1000);
  }, [locationData, weatherData, generateTrafficAlerts, generateRoadConditions, voiceEnabled, speakAlert, patterns]);

  // Initial load and periodic refresh
  useEffect(() => {
    if (locationData) {
      refreshAlerts();
      
      const interval = setInterval(() => {
        refreshAlerts();
      }, 60000); // Refresh every minute

      return () => clearInterval(interval);
    }
  }, [locationData?.latitude, locationData?.longitude]);

  // Update road conditions when weather changes
  useEffect(() => {
    if (weatherData) {
      const newConditions = generateRoadConditions(weatherData);
      setRoadConditions(newConditions);
    }
  }, [weatherData, generateRoadConditions]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="glass-card neon-border overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-warning/20 to-destructive/20 py-2 sm:py-3 px-3 sm:px-4">
        <CardTitle className="flex items-center gap-2 sm:gap-3 text-foreground text-sm sm:text-base">
          <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
          <span className="truncate">Traffic & Road Alerts</span>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="w-7 h-7 sm:w-8 sm:h-8"
            >
              {voiceEnabled ? <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" /> : <VolumeX className="w-3 h-3 sm:w-4 sm:h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshAlerts}
              disabled={isRefreshing || !locationData}
              className="w-7 h-7 sm:w-8 sm:h-8"
            >
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Badge variant="outline" className="bg-background/50 text-[10px] sm:text-xs hidden sm:flex">
              <Timer className="w-3 h-3 mr-1" />
              {formatTime(lastUpdate)}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-4 space-y-3 sm:space-y-4">
        {!locationData ? (
          <div className="text-center py-6 sm:py-8">
            <MapPin className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-muted-foreground mb-2 animate-bounce" />
            <p className="text-xs sm:text-sm text-muted-foreground">Waiting for location...</p>
          </div>
        ) : (
          <>
            {/* Road Conditions Summary */}
            <div className="bg-muted/30 rounded-lg p-2 sm:p-3 border border-border">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Navigation className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                Road Conditions
              </h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {roadConditions.map((condition) => (
                  <Badge
                    key={condition.id}
                    variant="outline"
                    className={`${getConditionColor(condition.severity)} border-current text-[10px] sm:text-xs`}
                  >
                    {getConditionIcon(condition.type)}
                    <span className="ml-1">{condition.description}</span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Active Alerts */}
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-warning" />
                Active Alerts ({alerts.length})
              </h3>
              
              <ScrollArea className="h-48 sm:h-56">
                <div className="space-y-2">
                  {alerts.length === 0 ? (
                    <div className="text-center py-4">
                      <Shield className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-secondary mb-2" />
                      <p className="text-xs sm:text-sm text-muted-foreground">No active alerts</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Roads are clear in your area</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-2 sm:p-3 rounded-lg border transition-all ${
                          alert.severity === 'critical' ? 'animate-pulse' : ''
                        } ${getSeverityColor(alert.severity)}`}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getAlertIcon(alert.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-semibold truncate">{alert.title}</h4>
                              <Badge variant="secondary" className="text-[9px] sm:text-[10px] uppercase">
                                {alert.severity}
                              </Badge>
                            </div>
                            <p className="text-[10px] sm:text-xs opacity-80 mt-0.5">
                              {alert.distance} km {alert.direction}
                            </p>
                            <div className="flex items-center gap-2 sm:gap-3 mt-1 text-[9px] sm:text-[10px] opacity-70">
                              <span className="flex items-center gap-1">
                                <Timer className="w-3 h-3" />
                                +{alert.estimatedDelay} min delay
                              </span>
                              <span>{alert.description}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-muted/20 rounded-lg">
                <p className="text-lg sm:text-xl font-bold text-warning">{alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Critical</p>
              </div>
              <div className="text-center p-2 bg-muted/20 rounded-lg">
                <p className="text-lg sm:text-xl font-bold text-primary">{alerts.reduce((acc, a) => acc + a.estimatedDelay, 0)}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Min Delay</p>
              </div>
              <div className="text-center p-2 bg-muted/20 rounded-lg">
                <p className="text-lg sm:text-xl font-bold text-secondary">{roadConditions.filter(c => c.severity === 'good').length > 0 ? 'Good' : 'Fair'}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Conditions</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TrafficAlerts;
