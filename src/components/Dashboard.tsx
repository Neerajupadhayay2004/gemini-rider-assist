import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LayoutDashboard,
  Leaf,
  Fuel,
  TrendingUp,
  Shield,
  Clock,
  Route,
  Zap,
  Award,
  TreePine,
  Droplets,
  Wind,
  ThermometerSun,
  Activity
} from 'lucide-react';

interface DashboardProps {
  sensorData?: {
    acceleration: { x: number; y: number; z: number };
    gyroscope: { alpha: number; beta: number; gamma: number };
  };
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
  };
}

const Dashboard = ({ sensorData, locationData, weatherData }: DashboardProps) => {
  const [stats, setStats] = useState({
    totalDistance: 0,
    rideTime: 0,
    avgSpeed: 0,
    maxSpeed: 0,
    ecoScore: 85,
    safetyScore: 92,
    fuelSaved: 0,
    co2Saved: 0,
    treesEquivalent: 0,
    smoothBraking: 0,
    gentleAcceleration: 0
  });

  const [speedHistory, setSpeedHistory] = useState<number[]>([]);

  useEffect(() => {
    if (locationData?.speed) {
      setSpeedHistory(prev => {
        const newHistory = [...prev, locationData.speed || 0];
        return newHistory.slice(-20);
      });

      setStats(prev => {
        const currentSpeed = locationData.speed || 0;
        const newMaxSpeed = Math.max(prev.maxSpeed, currentSpeed);
        const newAvgSpeed = speedHistory.length > 0 
          ? speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length 
          : currentSpeed;
        
        // Calculate eco metrics
        const isEcoDriving = currentSpeed > 20 && currentSpeed < 60;
        const newEcoScore = isEcoDriving ? Math.min(100, prev.ecoScore + 0.1) : Math.max(50, prev.ecoScore - 0.05);
        
        return {
          ...prev,
          totalDistance: prev.totalDistance + (currentSpeed * 0.001),
          rideTime: prev.rideTime + 1,
          avgSpeed: Math.round(newAvgSpeed),
          maxSpeed: Math.round(newMaxSpeed),
          ecoScore: Math.round(newEcoScore),
          fuelSaved: Math.round(prev.totalDistance * 0.05),
          co2Saved: Math.round(prev.totalDistance * 0.12),
          treesEquivalent: Math.round(prev.co2Saved / 21)
        };
      });
    }
  }, [locationData]);

  useEffect(() => {
    if (sensorData) {
      const { acceleration } = sensorData;
      const totalAcc = Math.sqrt(acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2);
      
      setStats(prev => {
        const isSmoothRiding = totalAcc < 12;
        const newSafetyScore = isSmoothRiding 
          ? Math.min(100, prev.safetyScore + 0.1) 
          : Math.max(50, prev.safetyScore - 0.2);

        return {
          ...prev,
          safetyScore: Math.round(newSafetyScore),
          smoothBraking: isSmoothRiding ? prev.smoothBraking + 1 : prev.smoothBraking,
          gentleAcceleration: totalAcc < 10 ? prev.gentleAcceleration + 1 : prev.gentleAcceleration
        };
      });
    }
  }, [sensorData]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="glass-card neon-border overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-accent/20 to-primary/20">
        <CardTitle className="flex items-center gap-3 text-foreground">
          <LayoutDashboard className="w-6 h-6 text-accent" />
          Eco Dashboard
          <Badge variant="outline" className="ml-auto bg-primary/20 text-primary border-primary">
            <Leaf className="w-3 h-3 mr-1" />
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/30">
            <Route className="w-6 h-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.totalDistance.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">किमी दूरी</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-xl border border-secondary/30">
            <Clock className="w-6 h-6 mx-auto text-secondary mb-2" />
            <p className="text-2xl font-bold text-foreground">{formatTime(stats.rideTime)}</p>
            <p className="text-xs text-muted-foreground">सवारी समय</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-accent/20 to-accent/5 rounded-xl border border-accent/30">
            <Zap className="w-6 h-6 mx-auto text-accent mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.avgSpeed}</p>
            <p className="text-xs text-muted-foreground">औसत गति km/h</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-warning/20 to-warning/5 rounded-xl border border-warning/30">
            <TrendingUp className="w-6 h-6 mx-auto text-warning mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.maxSpeed}</p>
            <p className="text-xs text-muted-foreground">अधिकतम गति</p>
          </div>
        </div>

        {/* Eco & Safety Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">Eco Score</span>
              </div>
              <span className="text-2xl font-bold text-primary">{stats.ecoScore}%</span>
            </div>
            <Progress value={stats.ecoScore} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {stats.ecoScore >= 80 ? '🌟 उत्कृष्ट! ईको-फ्रेंडली ड्राइविंग' : 'स्थिर गति बनाए रखें'}
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-secondary" />
                <span className="font-medium text-foreground">Safety Score</span>
              </div>
              <span className="text-2xl font-bold text-secondary">{stats.safetyScore}%</span>
            </div>
            <Progress value={stats.safetyScore} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {stats.safetyScore >= 85 ? '🛡️ सुरक्षित सवारी!' : 'धीमे और सावधानी से'}
            </p>
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-xl p-4 border border-primary/20">
          <h3 className="flex items-center gap-2 text-sm font-bold text-primary mb-4">
            <TreePine className="w-4 h-4" />
            पर्यावरण प्रभाव
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <Fuel className="w-6 h-6 mx-auto text-warning mb-2" />
              <p className="text-lg font-bold text-foreground">{stats.fuelSaved}ml</p>
              <p className="text-xs text-muted-foreground">ईंधन बचाया</p>
            </div>
            <div className="text-center">
              <Wind className="w-6 h-6 mx-auto text-accent mb-2" />
              <p className="text-lg font-bold text-foreground">{stats.co2Saved}g</p>
              <p className="text-xs text-muted-foreground">CO₂ कम किया</p>
            </div>
            <div className="text-center">
              <TreePine className="w-6 h-6 mx-auto text-primary mb-2" />
              <p className="text-lg font-bold text-foreground">{stats.treesEquivalent}</p>
              <p className="text-xs text-muted-foreground">पेड़ों के बराबर</p>
            </div>
          </div>
        </div>

        {/* Weather Info */}
        {weatherData && (
          <div className="flex items-center justify-around p-4 bg-muted/20 rounded-xl">
            <div className="flex items-center gap-2">
              <ThermometerSun className="w-5 h-5 text-warning" />
              <span className="text-foreground">{weatherData.temperature}°C</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-primary" />
              <span className="text-foreground">{weatherData.humidity || 60}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-accent" />
              <span className="text-foreground">{weatherData.windSpeed || 10} km/h</span>
            </div>
          </div>
        )}

        {/* Speed Graph Visualization */}
        <div className="p-4 bg-muted/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">गति ग्राफ</span>
            </div>
            <Badge variant="outline" className="text-xs border-border">
              Live
            </Badge>
          </div>
          <div className="flex items-end gap-1 h-16">
            {speedHistory.map((speed, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-primary to-accent rounded-t transition-all duration-300"
                style={{ height: `${Math.min(100, (speed / 100) * 100)}%` }}
              />
            ))}
            {speedHistory.length === 0 && (
              <p className="text-xs text-muted-foreground w-full text-center">डेटा लोड हो रहा है...</p>
            )}
          </div>
        </div>

        {/* Achievements */}
        <div className="flex flex-wrap gap-2">
          {stats.ecoScore >= 80 && (
            <Badge className="bg-primary/20 text-primary border border-primary/50">
              <Award className="w-3 h-3 mr-1" />
              Eco Champion
            </Badge>
          )}
          {stats.safetyScore >= 90 && (
            <Badge className="bg-secondary/20 text-secondary border border-secondary/50">
              <Shield className="w-3 h-3 mr-1" />
              Safe Rider
            </Badge>
          )}
          {stats.totalDistance >= 5 && (
            <Badge className="bg-accent/20 text-accent border border-accent/50">
              <Route className="w-3 h-3 mr-1" />
              Explorer
            </Badge>
          )}
          {stats.treesEquivalent >= 1 && (
            <Badge className="bg-primary/20 text-primary border border-primary/50">
              <TreePine className="w-3 h-3 mr-1" />
              Tree Saver
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
