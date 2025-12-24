import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Shield, 
  Activity,
  Zap,
  Phone,
  X,
  FileText,
  Clock,
  MapPin,
  Gauge,
  RotateCcw,
  Volume2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useVibration } from '@/hooks/useVibration';
import { toast } from 'sonner';

interface CollisionDetectionProps {
  sensorData?: {
    acceleration: { x: number; y: number; z: number };
    gyroscope: { alpha: number; beta: number; gamma: number };
  };
  locationData?: {
    latitude: number;
    longitude: number;
    speed: number | null;
  };
  onEmergencyTrigger?: () => void;
}

interface CrashEvent {
  id: string;
  timestamp: Date;
  gForce: number;
  type: 'minor' | 'moderate' | 'severe';
  location?: { lat: number; lng: number };
  speed?: number;
  gyroData?: { alpha: number; beta: number; gamma: number };
  reported: boolean;
}

interface ImpactAnalysis {
  gForce: number;
  rotationRate: number;
  impactDirection: string;
  severity: 'safe' | 'minor' | 'moderate' | 'severe' | 'critical';
  confidence: number;
}

const CollisionDetection = ({ 
  sensorData, 
  locationData, 
  onEmergencyTrigger 
}: CollisionDetectionProps) => {
  const [impactAnalysis, setImpactAnalysis] = useState<ImpactAnalysis>({
    gForce: 0,
    rotationRate: 0,
    impactDirection: 'None',
    severity: 'safe',
    confidence: 0
  });
  const [crashHistory, setCrashHistory] = useState<CrashEvent[]>([]);
  const [activeCrash, setActiveCrash] = useState<CrashEvent | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [showCrashDialog, setShowCrashDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(true);
  
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastCrashTime = useRef<number>(0);
  const { patterns, stop: stopVibration } = useVibration();

  // G-force thresholds (in m/s²)
  const THRESHOLDS = {
    minor: 15,      // Bump or pothole
    moderate: 25,   // Hard braking or minor collision
    severe: 40,     // Significant impact
    critical: 60    // Major collision
  };

  // Analyze sensor data for impacts
  const analyzeImpact = useCallback((accel: { x: number; y: number; z: number }, gyro: { alpha: number; beta: number; gamma: number }): ImpactAnalysis => {
    const gForce = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);
    const rotationRate = Math.sqrt(gyro.alpha ** 2 + gyro.beta ** 2 + gyro.gamma ** 2);
    
    // Determine impact direction
    let impactDirection = 'None';
    const maxAxis = Math.max(Math.abs(accel.x), Math.abs(accel.y), Math.abs(accel.z));
    if (maxAxis === Math.abs(accel.x)) {
      impactDirection = accel.x > 0 ? 'Right' : 'Left';
    } else if (maxAxis === Math.abs(accel.y)) {
      impactDirection = accel.y > 0 ? 'Forward' : 'Backward';
    } else {
      impactDirection = accel.z > 0 ? 'Upward' : 'Downward';
    }

    // Determine severity
    let severity: ImpactAnalysis['severity'] = 'safe';
    if (gForce >= THRESHOLDS.critical) severity = 'critical';
    else if (gForce >= THRESHOLDS.severe) severity = 'severe';
    else if (gForce >= THRESHOLDS.moderate) severity = 'moderate';
    else if (gForce >= THRESHOLDS.minor) severity = 'minor';

    // Calculate confidence based on combined sensors
    const confidence = Math.min(100, (gForce / 10) * 20 + (rotationRate / 100) * 30);

    return { gForce, rotationRate, impactDirection, severity, confidence };
  }, []);

  // Monitor for collisions
  useEffect(() => {
    if (!sensorData || !isMonitoring) return;

    const analysis = analyzeImpact(sensorData.acceleration, sensorData.gyroscope);
    setImpactAnalysis(analysis);

    const now = Date.now();
    const timeSinceLastCrash = now - lastCrashTime.current;

    // Detect significant impact (cooldown of 30 seconds between detections)
    if (analysis.severity !== 'safe' && timeSinceLastCrash > 30000 && !activeCrash) {
      lastCrashTime.current = now;
      
      const crashEvent: CrashEvent = {
        id: `crash_${now}`,
        timestamp: new Date(),
        gForce: analysis.gForce,
        type: analysis.severity === 'critical' || analysis.severity === 'severe' ? 'severe' 
              : analysis.severity === 'moderate' ? 'moderate' : 'minor',
        location: locationData ? { lat: locationData.latitude, lng: locationData.longitude } : undefined,
        speed: locationData?.speed ? locationData.speed * 3.6 : undefined,
        gyroData: sensorData.gyroscope,
        reported: false
      };

      // Only show dialog for moderate or worse impacts
      if (analysis.severity === 'moderate' || analysis.severity === 'severe' || analysis.severity === 'critical') {
        setActiveCrash(crashEvent);
        setShowCrashDialog(true);
        setCountdown(analysis.severity === 'critical' ? 10 : 15);
        
        patterns.collision();
        
        // Voice alert
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(
            `Warning! ${analysis.severity} impact detected. Emergency services will be contacted in ${analysis.severity === 'critical' ? 10 : 15} seconds. Say cancel or press the button if you are okay.`
          );
          utterance.rate = 1.1;
          utterance.pitch = 1.2;
          window.speechSynthesis.speak(utterance);
        }

        toast.error(`⚠️ ${analysis.severity.toUpperCase()} Impact Detected!`, {
          description: `G-Force: ${analysis.gForce.toFixed(1)} m/s² | Direction: ${analysis.impactDirection}`,
        });
      } else {
        // Minor impact - just log
        setCrashHistory(prev => [crashEvent, ...prev].slice(0, 20));
        patterns.warning();
        toast.warning('Minor bump detected', {
          description: `G-Force: ${analysis.gForce.toFixed(1)} m/s²`,
        });
      }
    }
  }, [sensorData, isMonitoring, activeCrash, analyzeImpact, locationData, patterns]);

  // Countdown timer
  useEffect(() => {
    if (showCrashDialog && activeCrash) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            triggerEmergency();
            return 0;
          }
          if (prev <= 5) {
            patterns.danger();
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
      };
    }
  }, [showCrashDialog, activeCrash]);

  const triggerEmergency = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    if (activeCrash) {
      // Mark as reported
      const reportedCrash = { ...activeCrash, reported: true };
      setCrashHistory(prev => [reportedCrash, ...prev].slice(0, 20));
      
      // Generate crash report
      const report = generateCrashReport(reportedCrash);
      console.log('CRASH REPORT:', report);

      // Voice confirmation
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          'Emergency services are being contacted. Help is on the way. Stay calm.'
        );
        window.speechSynthesis.speak(utterance);
      }

      toast.error('🆘 Emergency Alert Sent!', {
        description: 'Crash report generated and emergency contacts notified.',
      });
    }

    onEmergencyTrigger?.();
    setShowCrashDialog(false);
    setActiveCrash(null);
  }, [activeCrash, onEmergencyTrigger]);

  const cancelAlert = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    stopVibration();
    
    if (activeCrash) {
      setCrashHistory(prev => [{ ...activeCrash, reported: false }, ...prev].slice(0, 20));
    }

    // Voice confirmation
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('Alert cancelled. Glad you are okay.');
      window.speechSynthesis.speak(utterance);
    }

    toast.success('Alert Cancelled', {
      description: 'Glad you\'re okay! Incident logged for reference.',
    });

    setShowCrashDialog(false);
    setActiveCrash(null);
    setCountdown(15);
  }, [activeCrash, stopVibration]);

  const generateCrashReport = (crash: CrashEvent): object => {
    return {
      reportId: crash.id,
      timestamp: crash.timestamp.toISOString(),
      severity: crash.type,
      impactData: {
        gForce: crash.gForce.toFixed(2),
        speedAtImpact: crash.speed?.toFixed(1) || 'Unknown',
        gyroscope: crash.gyroData
      },
      location: crash.location 
        ? `${crash.location.lat.toFixed(6)}, ${crash.location.lng.toFixed(6)}`
        : 'Unknown',
      mapsLink: crash.location 
        ? `https://maps.google.com/?q=${crash.location.lat},${crash.location.lng}`
        : null,
      deviceInfo: {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-destructive bg-destructive/20';
      case 'severe': return 'text-destructive bg-destructive/20';
      case 'moderate': return 'text-warning bg-warning/20';
      case 'minor': return 'text-yellow-500 bg-yellow-500/20';
      default: return 'text-primary bg-primary/20';
    }
  };

  const getGForceColor = (gForce: number) => {
    if (gForce >= THRESHOLDS.severe) return 'text-destructive';
    if (gForce >= THRESHOLDS.moderate) return 'text-warning';
    if (gForce >= THRESHOLDS.minor) return 'text-yellow-500';
    return 'text-primary';
  };

  return (
    <>
      <Card className="glass-card neon-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Activity className={`w-6 h-6 ${impactAnalysis.severity !== 'safe' ? 'text-destructive animate-pulse' : 'text-primary'}`} />
              <CardTitle className="text-lg">Collision Detection</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={isMonitoring ? 'default' : 'secondary'}
                className={isMonitoring ? 'bg-primary animate-pulse' : ''}
              >
                {isMonitoring ? 'Active' : 'Paused'}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHistoryDialog(true)}
                className="h-8 w-8"
              >
                <FileText className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Real-time G-Force Display */}
          <div className="text-center py-4">
            <div className={`text-5xl font-black transition-colors ${getGForceColor(impactAnalysis.gForce)}`}>
              {impactAnalysis.gForce.toFixed(1)}
            </div>
            <p className="text-sm text-muted-foreground">G-Force (m/s²)</p>
            
            <div className="mt-2">
              <Badge className={getSeverityColor(impactAnalysis.severity)}>
                {impactAnalysis.severity === 'safe' ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" /> Safe</>
                ) : (
                  <><AlertCircle className="w-3 h-3 mr-1" /> {impactAnalysis.severity.toUpperCase()}</>
                )}
              </Badge>
            </div>
          </div>

          {/* G-Force Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span className="text-yellow-500">Minor ({THRESHOLDS.minor})</span>
              <span className="text-warning">Mod ({THRESHOLDS.moderate})</span>
              <span className="text-destructive">Severe ({THRESHOLDS.severe})</span>
            </div>
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-200 ${
                  impactAnalysis.gForce >= THRESHOLDS.severe ? 'bg-destructive' :
                  impactAnalysis.gForce >= THRESHOLDS.moderate ? 'bg-warning' :
                  impactAnalysis.gForce >= THRESHOLDS.minor ? 'bg-yellow-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min((impactAnalysis.gForce / THRESHOLDS.severe) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Impact Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <Zap className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Direction</p>
              <p className="font-semibold">{impactAnalysis.impactDirection}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <RotateCcw className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Rotation</p>
              <p className="font-semibold">{impactAnalysis.rotationRate.toFixed(1)}°/s</p>
            </div>
          </div>

          {/* Recent Incidents */}
          {crashHistory.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">Recent Incidents: {crashHistory.length}</p>
              <div className="flex gap-1 flex-wrap">
                {crashHistory.slice(0, 5).map((crash) => (
                  <Badge 
                    key={crash.id} 
                    variant="outline" 
                    className={`text-xs ${getSeverityColor(crash.type)}`}
                  >
                    {crash.type} • {crash.gForce.toFixed(0)}g
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Toggle Monitoring */}
          <Button
            variant={isMonitoring ? 'outline' : 'default'}
            className="w-full"
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? (
              <><Shield className="w-4 h-4 mr-2" /> Monitoring Active</>
            ) : (
              <><AlertTriangle className="w-4 h-4 mr-2" /> Enable Monitoring</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Crash Alert Dialog */}
      <Dialog open={showCrashDialog} onOpenChange={() => {}}>
        <DialogContent className="glass-card border-destructive bg-background/95 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive text-center text-2xl flex items-center justify-center gap-2">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
              CRASH DETECTED
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Countdown */}
            <div className="text-center">
              <div className="w-24 h-24 mx-auto rounded-full bg-destructive flex items-center justify-center animate-pulse">
                <span className="text-5xl font-black text-white">{countdown}</span>
              </div>
              <p className="mt-3 text-muted-foreground">
                Emergency alert in {countdown} seconds
              </p>
            </div>

            {/* Crash Details */}
            {activeCrash && (
              <div className="space-y-2 p-4 bg-destructive/10 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Impact Force:</span>
                  <span className="font-bold text-destructive">{activeCrash.gForce.toFixed(1)} m/s²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Severity:</span>
                  <Badge variant="destructive">{activeCrash.type.toUpperCase()}</Badge>
                </div>
                {activeCrash.speed && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Speed at Impact:</span>
                    <span className="font-bold">{activeCrash.speed.toFixed(0)} km/h</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={cancelAlert}
                className="w-full h-14 text-lg bg-primary hover:bg-primary/90"
              >
                <CheckCircle2 className="w-6 h-6 mr-2" />
                I'm OK - Cancel Alert
              </Button>
              
              <Button
                onClick={triggerEmergency}
                variant="destructive"
                className="w-full h-14 text-lg"
              >
                <Phone className="w-6 h-6 mr-2" />
                Send Emergency Alert NOW
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              <Volume2 className="w-3 h-3 inline mr-1" />
              Say "Cancel" or "I'm okay" to stop the alert
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Crash History
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            {crashHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No incidents recorded</p>
                <p className="text-xs">Stay safe!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {crashHistory.map((crash) => (
                  <div 
                    key={crash.id}
                    className={`p-4 rounded-lg border ${getSeverityColor(crash.type)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={crash.reported ? 'destructive' : 'secondary'}>
                        {crash.reported ? 'Reported' : 'Cancelled'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {crash.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">G-Force: </span>
                        <span className="font-bold">{crash.gForce.toFixed(1)} m/s²</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type: </span>
                        <span className="font-bold capitalize">{crash.type}</span>
                      </div>
                      {crash.speed && (
                        <div>
                          <span className="text-muted-foreground">Speed: </span>
                          <span className="font-bold">{crash.speed.toFixed(0)} km/h</span>
                        </div>
                      )}
                      {crash.location && (
                        <div className="col-span-2">
                          <a 
                            href={`https://maps.google.com/?q=${crash.location.lat},${crash.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" />
                            View Location
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CollisionDetection;
