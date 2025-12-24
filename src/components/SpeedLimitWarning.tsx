import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Gauge, 
  AlertTriangle, 
  Shield, 
  Volume2, 
  VolumeX,
  Car,
  Building2,
  Trees,
  GraduationCap,
  Construction,
  Home
} from 'lucide-react';
import { useVibration } from '@/hooks/useVibration';
import { toast } from 'sonner';

interface SpeedLimitWarningProps {
  locationData?: {
    latitude: number;
    longitude: number;
    speed: number | null;
  };
  language?: string;
}

interface RoadZone {
  type: 'highway' | 'city' | 'residential' | 'school' | 'construction' | 'rural';
  speedLimit: number;
  name: string;
  icon: React.ReactNode;
}

// Multi-language translations
const translations: Record<string, Record<string, string>> = {
  'en-US': {
    speedLimit: 'Speed Limit',
    currentSpeed: 'Current Speed',
    warning: 'Over Speed Limit!',
    safe: 'Safe Speed',
    zone: 'Zone',
    highway: 'Highway',
    city: 'City Road',
    residential: 'Residential',
    school: 'School Zone',
    construction: 'Construction',
    rural: 'Rural Road',
    slowDown: 'Please slow down!',
    speedingAlert: 'You are exceeding the speed limit',
    voiceAlerts: 'Voice Alerts',
    kmh: 'km/h',
    over: 'over limit',
    under: 'under limit',
    atLimit: 'at limit',
    dangerZone: 'DANGER',
    cautionZone: 'CAUTION'
  },
  'hi-IN': {
    speedLimit: 'गति सीमा',
    currentSpeed: 'वर्तमान गति',
    warning: 'गति सीमा से अधिक!',
    safe: 'सुरक्षित गति',
    zone: 'ज़ोन',
    highway: 'राजमार्ग',
    city: 'शहर सड़क',
    residential: 'आवासीय',
    school: 'स्कूल ज़ोन',
    construction: 'निर्माण',
    rural: 'ग्रामीण सड़क',
    slowDown: 'कृपया धीमे चलें!',
    speedingAlert: 'आप गति सीमा से अधिक हैं',
    voiceAlerts: 'वॉइस अलर्ट',
    kmh: 'किमी/घंटा',
    over: 'से अधिक',
    under: 'से कम',
    atLimit: 'सीमा पर',
    dangerZone: 'खतरा',
    cautionZone: 'सावधान'
  },
  'es-ES': {
    speedLimit: 'Límite',
    currentSpeed: 'Velocidad',
    warning: '¡Exceso de velocidad!',
    safe: 'Velocidad segura',
    zone: 'Zona',
    highway: 'Autopista',
    city: 'Ciudad',
    residential: 'Residencial',
    school: 'Escolar',
    construction: 'Construcción',
    rural: 'Rural',
    slowDown: '¡Reduzca velocidad!',
    speedingAlert: 'Excede el límite',
    voiceAlerts: 'Alertas de voz',
    kmh: 'km/h',
    over: 'sobre límite',
    under: 'bajo límite',
    atLimit: 'en límite',
    dangerZone: 'PELIGRO',
    cautionZone: 'PRECAUCIÓN'
  }
};

const SpeedLimitWarning = ({ locationData, language = 'en-US' }: SpeedLimitWarningProps) => {
  const [currentZone, setCurrentZone] = useState<RoadZone | null>(null);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastWarningTime, setLastWarningTime] = useState(0);
  const { patterns } = useVibration();

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en-US'][key] || key;
  };

  // Road zone definitions with icons
  const roadZones: RoadZone[] = [
    { type: 'highway', speedLimit: 120, name: t('highway'), icon: <Car className="w-5 h-5" /> },
    { type: 'city', speedLimit: 50, name: t('city'), icon: <Building2 className="w-5 h-5" /> },
    { type: 'residential', speedLimit: 30, name: t('residential'), icon: <Home className="w-5 h-5" /> },
    { type: 'school', speedLimit: 25, name: t('school'), icon: <GraduationCap className="w-5 h-5" /> },
    { type: 'construction', speedLimit: 20, name: t('construction'), icon: <Construction className="w-5 h-5" /> },
    { type: 'rural', speedLimit: 80, name: t('rural'), icon: <Trees className="w-5 h-5" /> },
  ];

  // Simulate zone detection based on location (in real app, use mapping API)
  const detectZone = useCallback((lat: number, lng: number): RoadZone => {
    // Simple simulation based on coordinates
    const hash = Math.abs(Math.sin(lat * 1000) + Math.cos(lng * 1000)) * 100;
    
    if (hash < 10) return roadZones[3]; // School zone
    if (hash < 20) return roadZones[4]; // Construction
    if (hash < 40) return roadZones[2]; // Residential
    if (hash < 60) return roadZones[1]; // City
    if (hash < 80) return roadZones[5]; // Rural
    return roadZones[0]; // Highway
  }, []);

  // Speed warning logic
  useEffect(() => {
    if (!locationData?.latitude || !locationData?.longitude) return;

    const zone = detectZone(locationData.latitude, locationData.longitude);
    setCurrentZone(zone);

    const speedKmh = locationData.speed !== null ? locationData.speed * 3.6 : 0;
    const isOver = speedKmh > zone.speedLimit;
    setIsOverLimit(isOver);

    // Voice and vibration warning
    const now = Date.now();
    if (isOver && voiceEnabled && (now - lastWarningTime > 10000)) {
      setLastWarningTime(now);
      
      patterns.speedWarning();
      
      const warningText = `${t('warning')} ${t('slowDown')} ${t('speedLimit')}: ${zone.speedLimit} ${t('kmh')}. ${t('currentSpeed')}: ${speedKmh.toFixed(0)} ${t('kmh')}.`;
      
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(warningText);
        utterance.lang = language;
        utterance.rate = 1.1;
        utterance.pitch = 1.2;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }

      toast.error(`${t('warning')} ${zone.speedLimit} ${t('kmh')} ${t('zone')}`, {
        description: `${t('currentSpeed')}: ${speedKmh.toFixed(0)} ${t('kmh')}`,
      });
    }
  }, [locationData, voiceEnabled, language, lastWarningTime]);

  const speedKmh = locationData?.speed !== null ? (locationData?.speed || 0) * 3.6 : 0;
  const speedPercentage = currentZone ? Math.min((speedKmh / currentZone.speedLimit) * 100, 150) : 0;
  const overAmount = currentZone ? speedKmh - currentZone.speedLimit : 0;

  const getSpeedStatus = () => {
    if (!currentZone) return { color: 'text-muted-foreground', bg: 'bg-muted', status: '' };
    
    const ratio = speedKmh / currentZone.speedLimit;
    if (ratio > 1.2) return { color: 'text-destructive', bg: 'bg-destructive/20', status: t('dangerZone') };
    if (ratio > 1) return { color: 'text-warning', bg: 'bg-warning/20', status: t('cautionZone') };
    return { color: 'text-primary', bg: 'bg-primary/20', status: t('safe') };
  };

  const status = getSpeedStatus();

  return (
    <Card className="glass-card neon-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Gauge className={`w-6 h-6 ${status.color}`} />
            <CardTitle className="text-lg">{t('speedLimit')}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isOverLimit && (
              <Badge variant="destructive" className="animate-pulse flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {t('warning')}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="h-8 w-8"
            >
              {voiceEnabled ? (
                <Volume2 className="w-4 h-4 text-primary" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Zone */}
        {currentZone && (
          <div className={`flex items-center justify-between p-3 rounded-lg ${status.bg}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full bg-background/50 ${status.color}`}>
                {currentZone.icon}
              </div>
              <div>
                <p className="text-sm font-medium">{currentZone.name}</p>
                <p className="text-xs text-muted-foreground">{t('zone')}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${status.color}`}>
                {currentZone.speedLimit}
              </p>
              <p className="text-xs text-muted-foreground">{t('kmh')}</p>
            </div>
          </div>
        )}

        {/* Speed Display */}
        <div className="text-center py-4">
          <div className={`text-5xl font-black ${status.color} transition-colors`}>
            {speedKmh.toFixed(0)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t('kmh')}</p>
          
          {currentZone && (
            <div className="mt-2">
              {overAmount > 0 ? (
                <Badge variant="destructive" className="text-xs">
                  +{overAmount.toFixed(0)} {t('over')}
                </Badge>
              ) : overAmount < 0 ? (
                <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                  {Math.abs(overAmount).toFixed(0)} {t('under')}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  {t('atLimit')}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {currentZone?.speedLimit || 0}
            </span>
            <span>{currentZone ? currentZone.speedLimit * 1.5 : 0}</span>
          </div>
          <Progress 
            value={speedPercentage > 100 ? 100 : speedPercentage} 
            className={`h-3 ${isOverLimit ? 'bg-destructive/30' : ''}`}
          />
          {speedPercentage > 100 && (
            <div className="w-full bg-destructive/50 rounded-full h-1 overflow-hidden">
              <div 
                className="h-full bg-destructive animate-pulse"
                style={{ width: `${Math.min(((speedPercentage - 100) / 50) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Zone Quick View */}
        <div className="grid grid-cols-3 gap-2">
          {roadZones.slice(0, 6).map((zone) => (
            <div
              key={zone.type}
              className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                currentZone?.type === zone.type 
                  ? 'bg-primary/20 border border-primary/50' 
                  : 'bg-muted/30'
              }`}
            >
              <div className={`${currentZone?.type === zone.type ? 'text-primary' : 'text-muted-foreground'}`}>
                {zone.icon}
              </div>
              <span className="text-xs mt-1 font-medium">{zone.speedLimit}</span>
            </div>
          ))}
        </div>

        {/* Status Message */}
        {status.status && (
          <div className={`text-center py-2 rounded-lg ${status.bg}`}>
            <p className={`text-sm font-semibold ${status.color}`}>
              {status.status}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpeedLimitWarning;
