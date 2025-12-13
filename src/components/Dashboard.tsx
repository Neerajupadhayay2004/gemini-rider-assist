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
  Activity,
  Battery,
  Gauge,
  Target,
  Heart
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
    gentleAcceleration: 0,
    calories: 0,
    efficiency: 88
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
          treesEquivalent: Math.round(prev.co2Saved / 21),
          calories: Math.round(prev.totalDistance * 25)
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
      <CardHeader className="bg-gradient-to-r from-accent/20 to-primary/20 py-3 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 sm:gap-3 text-foreground text-sm sm:text-base">
          <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
          <span className="truncate">Eco Dashboard</span>
          <Badge variant="outline" className="ml-auto bg-primary/20 text-primary border-primary text-xs">
            <Leaf className="w-3 h-3 mr-1" />
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Main Stats Grid - Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div className="text-center p-2 sm:p-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/30">
            <Route className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-primary mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.totalDistance.toFixed(1)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Distance (km)</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-xl border border-secondary/30">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-secondary mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold text-foreground">{formatTime(stats.rideTime)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Ride Time</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-gradient-to-br from-accent/20 to-accent/5 rounded-xl border border-accent/30">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-accent mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.avgSpeed}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Avg Speed (km/h)</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-gradient-to-br from-warning/20 to-warning/5 rounded-xl border border-warning/30">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-warning mb-1 sm:mb-2" />
            <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.maxSpeed}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Max Speed</p>
          </div>
        </div>

        {/* Eco & Safety Scores - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-muted/30 rounded-xl space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="font-medium text-foreground text-sm sm:text-base">Eco Score</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold text-primary">{stats.ecoScore}%</span>
            </div>
            <Progress value={stats.ecoScore} className="h-2" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {stats.ecoScore >= 80 ? '🌟 Excellent! Eco-friendly driving' : 'Maintain steady speed'}
            </p>
          </div>
          <div className="p-3 sm:p-4 bg-muted/30 rounded-xl space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
                <span className="font-medium text-foreground text-sm sm:text-base">Safety Score</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold text-secondary">{stats.safetyScore}%</span>
            </div>
            <Progress value={stats.safetyScore} className="h-2" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {stats.safetyScore >= 85 ? '🛡️ Safe riding!' : 'Slow down and be careful'}
            </p>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 sm:p-3 bg-muted/20 rounded-lg border border-border">
            <Gauge className="w-4 h-4 mx-auto text-accent mb-1" />
            <p className="text-sm sm:text-lg font-bold text-foreground">{stats.efficiency}%</p>
            <p className="text-[9px] sm:text-xs text-muted-foreground">Efficiency</p>
          </div>
          <div className="text-center p-2 sm:p-3 bg-muted/20 rounded-lg border border-border">
            <Heart className="w-4 h-4 mx-auto text-destructive mb-1" />
            <p className="text-sm sm:text-lg font-bold text-foreground">{stats.calories}</p>
            <p className="text-[9px] sm:text-xs text-muted-foreground">Calories</p>
          </div>
          <div className="text-center p-2 sm:p-3 bg-muted/20 rounded-lg border border-border">
            <Target className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-sm sm:text-lg font-bold text-foreground">{stats.smoothBraking}</p>
            <p className="text-[9px] sm:text-xs text-muted-foreground">Smooth Stops</p>
          </div>
        </div>

        {/* Environmental Impact - Responsive */}
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-xl p-3 sm:p-4 border border-primary/20">
          <h3 className="flex items-center gap-2 text-xs sm:text-sm font-bold text-primary mb-3 sm:mb-4">
            <TreePine className="w-4 h-4" />
            Environmental Impact
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="text-center">
              <Fuel className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-warning mb-1 sm:mb-2" />
              <p className="text-sm sm:text-lg font-bold text-foreground">{stats.fuelSaved}ml</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">Fuel Saved</p>
            </div>
            <div className="text-center">
              <Wind className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-accent mb-1 sm:mb-2" />
              <p className="text-sm sm:text-lg font-bold text-foreground">{stats.co2Saved}g</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">CO₂ Reduced</p>
            </div>
            <div className="text-center">
              <TreePine className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-primary mb-1 sm:mb-2" />
              <p className="text-sm sm:text-lg font-bold text-foreground">{stats.treesEquivalent}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">Trees Equiv.</p>
            </div>
          </div>
        </div>

        {/* Weather Info - Responsive */}
        {weatherData && (
          <div className="flex items-center justify-around p-3 sm:p-4 bg-muted/20 rounded-xl">
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
              <ThermometerSun className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
              <span className="text-foreground text-sm sm:text-base">{weatherData.temperature}°C</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
              <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="text-foreground text-sm sm:text-base">{weatherData.humidity || 60}%</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
              <Wind className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              <span className="text-foreground text-sm sm:text-base">{weatherData.windSpeed || 10} km/h</span>
            </div>
          </div>
        )}

        {/* Speed Graph Visualization - Responsive */}
        <div className="p-3 sm:p-4 bg-muted/20 rounded-xl">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-foreground">Speed Graph</span>
            </div>
            <Badge variant="outline" className="text-[10px] sm:text-xs border-border">
              Live
            </Badge>
          </div>
          <div className="flex items-end gap-0.5 sm:gap-1 h-12 sm:h-16">
            {speedHistory.map((speed, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-primary to-accent rounded-t transition-all duration-300"
                style={{ height: `${Math.min(100, (speed / 100) * 100)}%` }}
              />
            ))}
            {speedHistory.length === 0 && (
              <p className="text-[10px] sm:text-xs text-muted-foreground w-full text-center">Loading data...</p>
            )}
          </div>
        </div>

        {/* Achievements - Responsive */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {stats.ecoScore >= 80 && (
            <Badge className="bg-primary/20 text-primary border border-primary/50 text-[10px] sm:text-xs">
              <Award className="w-3 h-3 mr-1" />
              Eco Champion
            </Badge>
          )}
          {stats.safetyScore >= 90 && (
            <Badge className="bg-secondary/20 text-secondary border border-secondary/50 text-[10px] sm:text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Safe Rider
            </Badge>
          )}
          {stats.totalDistance >= 5 && (
            <Badge className="bg-accent/20 text-accent border border-accent/50 text-[10px] sm:text-xs">
              <Route className="w-3 h-3 mr-1" />
              Explorer
            </Badge>
          )}
          {stats.treesEquivalent >= 1 && (
            <Badge className="bg-primary/20 text-primary border border-primary/50 text-[10px] sm:text-xs">
              <TreePine className="w-3 h-3 mr-1" />
              Tree Saver
            </Badge>
          )}
          {stats.calories >= 100 && (
            <Badge className="bg-destructive/20 text-destructive border border-destructive/50 text-[10px] sm:text-xs">
              <Heart className="w-3 h-3 mr-1" />
              Calorie Burner
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
