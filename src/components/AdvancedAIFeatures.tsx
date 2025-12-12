import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, AlertTriangle, Activity, Route, Lightbulb, Shield, Zap } from 'lucide-react';
import { useVibration } from '@/hooks/useVibration';
import { offlineStorage } from '@/lib/offlineStorage';

interface AdvancedAIFeaturesProps {
  sensorData?: {
    acceleration: { x: number; y: number; z: number };
    gyroscope: { alpha: number; beta: number; gamma: number };
  };
  locationData?: {
    latitude: number;
    longitude: number;
    speed: number | null;
  };
}

interface RidingAnalysis {
  safetyScore: number;
  ridingStyle: 'smooth' | 'moderate' | 'aggressive';
  warnings: string[];
  tips: string[];
  stats: {
    avgSpeed: number;
    maxAcceleration: number;
    sharpTurns: number;
    hardBrakes: number;
  };
}

const AdvancedAIFeatures = ({ sensorData, locationData }: AdvancedAIFeaturesProps) => {
  const [analysis, setAnalysis] = useState<RidingAnalysis>({
    safetyScore: 100,
    ridingStyle: 'smooth',
    warnings: [],
    tips: [],
    stats: {
      avgSpeed: 0,
      maxAcceleration: 0,
      sharpTurns: 0,
      hardBrakes: 0,
    },
  });
  const [predictionMode, setPredictionMode] = useState<'safe' | 'caution' | 'danger'>('safe');
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [accelHistory, setAccelHistory] = useState<number[]>([]);
  const { patterns } = useVibration();

  // Real-time analysis
  useEffect(() => {
    if (!sensorData) return;

    const accelMag = Math.sqrt(
      sensorData.acceleration.x ** 2 +
      sensorData.acceleration.y ** 2 +
      sensorData.acceleration.z ** 2
    );

    // Update acceleration history
    setAccelHistory(prev => {
      const newHistory = [...prev, accelMag].slice(-50);
      return newHistory;
    });

    // Store sensor data offline
    offlineStorage.saveSensorData({
      acceleration: sensorData.acceleration,
      gyroscope: sensorData.gyroscope,
      location: locationData,
    }).catch(console.error);

    // Analyze riding pattern
    analyzeRiding(accelMag);

  }, [sensorData, locationData]);

  // Speed tracking
  useEffect(() => {
    if (locationData?.speed !== null && locationData?.speed !== undefined) {
      const speedKmh = locationData.speed * 3.6;
      setSpeedHistory(prev => {
        const newHistory = [...prev, speedKmh].slice(-50);
        return newHistory;
      });
    }
  }, [locationData]);

  const analyzeRiding = (currentAccel: number) => {
    const newAnalysis = { ...analysis };
    const warnings: string[] = [];
    const tips: string[] = [];

    // Update max acceleration
    if (currentAccel > analysis.stats.maxAcceleration) {
      newAnalysis.stats.maxAcceleration = currentAccel;
    }

    // Update average speed
    if (speedHistory.length > 0) {
      newAnalysis.stats.avgSpeed = speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length;
    }

    // Detect sharp turns (high gyroscope values)
    if (sensorData) {
      const turnRate = Math.abs(sensorData.gyroscope.gamma);
      if (turnRate > 45) {
        newAnalysis.stats.sharpTurns++;
        warnings.push('⚠️ Sharp turn detected - maintain control');
        patterns.turnWarning();
      }
    }

    // Detect hard braking
    if (currentAccel > 15) {
      newAnalysis.stats.hardBrakes++;
      if (currentAccel > 20) {
        warnings.push('🛑 Hard braking detected!');
        patterns.hardBrake();
      }
    }

    // Calculate safety score
    let score = 100;
    score -= newAnalysis.stats.sharpTurns * 2;
    score -= newAnalysis.stats.hardBrakes * 3;
    if (newAnalysis.stats.avgSpeed > 60) score -= 10;
    if (newAnalysis.stats.maxAcceleration > 25) score -= 15;
    newAnalysis.safetyScore = Math.max(0, Math.min(100, score));

    // Determine riding style
    if (score >= 80) {
      newAnalysis.ridingStyle = 'smooth';
      setPredictionMode('safe');
    } else if (score >= 50) {
      newAnalysis.ridingStyle = 'moderate';
      setPredictionMode('caution');
    } else {
      newAnalysis.ridingStyle = 'aggressive';
      setPredictionMode('danger');
    }

    // AI Tips based on analysis
    if (newAnalysis.stats.avgSpeed > 40) {
      tips.push('💡 Consider reducing speed for better control');
    }
    if (newAnalysis.stats.sharpTurns > 5) {
      tips.push('🔄 Smoother turns improve tire life and safety');
    }
    if (newAnalysis.stats.hardBrakes > 3) {
      tips.push('🚗 Maintain more distance for gradual braking');
    }
    if (score >= 90) {
      tips.push('⭐ Excellent riding! Keep up the safe practices');
    }

    newAnalysis.warnings = warnings;
    newAnalysis.tips = tips;
    setAnalysis(newAnalysis);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPredictionBadge = () => {
    switch (predictionMode) {
      case 'safe':
        return <Badge className="bg-green-500">Safe Conditions</Badge>;
      case 'caution':
        return <Badge className="bg-yellow-500">Exercise Caution</Badge>;
      case 'danger':
        return <Badge className="bg-red-500">High Risk</Badge>;
    }
  };

  const getStyleIcon = () => {
    switch (analysis.ridingStyle) {
      case 'smooth':
        return <Shield className="w-6 h-6 text-green-500" />;
      case 'moderate':
        return <Activity className="w-6 h-6 text-yellow-500" />;
      case 'aggressive':
        return <Zap className="w-6 h-6 text-red-500" />;
    }
  };

  return (
    <Card className="glass-card p-6 neon-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-primary animate-pulse" />
          <div>
            <h2 className="text-2xl font-bold gradient-text">AI Analysis</h2>
            <p className="text-sm text-muted-foreground">Real-time riding intelligence</p>
          </div>
        </div>
        {getPredictionBadge()}
      </div>

      {/* Safety Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Safety Score</span>
          <span className={`text-2xl font-black ${getScoreColor(analysis.safetyScore)}`}>
            {analysis.safetyScore}%
          </span>
        </div>
        <Progress 
          value={analysis.safetyScore} 
          className="h-3"
        />
      </div>

      {/* Riding Style */}
      <div className="flex items-center justify-between p-4 bg-background/30 rounded-lg mb-4">
        <div className="flex items-center gap-3">
          {getStyleIcon()}
          <div>
            <p className="text-sm text-muted-foreground">Riding Style</p>
            <p className="font-bold capitalize">{analysis.ridingStyle}</p>
          </div>
        </div>
        <TrendingUp className="w-6 h-6 text-primary" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-background/30 rounded-lg text-center">
          <Route className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-xl font-bold">{analysis.stats.avgSpeed.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Avg km/h</p>
        </div>
        <div className="p-3 bg-background/30 rounded-lg text-center">
          <Activity className="w-5 h-5 mx-auto mb-1 text-secondary" />
          <p className="text-xl font-bold">{analysis.stats.maxAcceleration.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Max G-Force</p>
        </div>
        <div className="p-3 bg-background/30 rounded-lg text-center">
          <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-warning" />
          <p className="text-xl font-bold">{analysis.stats.sharpTurns}</p>
          <p className="text-xs text-muted-foreground">Sharp Turns</p>
        </div>
        <div className="p-3 bg-background/30 rounded-lg text-center">
          <Zap className="w-5 h-5 mx-auto mb-1 text-destructive" />
          <p className="text-xl font-bold">{analysis.stats.hardBrakes}</p>
          <p className="text-xs text-muted-foreground">Hard Brakes</p>
        </div>
      </div>

      {/* Active Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Active Warnings
          </p>
          <div className="space-y-1">
            {analysis.warnings.map((warning, idx) => (
              <div key={idx} className="p-2 bg-warning/10 border border-warning/30 rounded text-sm">
                {warning}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Tips */}
      {analysis.tips.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            AI Recommendations
          </p>
          <div className="space-y-1">
            {analysis.tips.map((tip, idx) => (
              <div key={idx} className="p-2 bg-primary/10 border border-primary/30 rounded text-sm">
                {tip}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default AdvancedAIFeatures;
