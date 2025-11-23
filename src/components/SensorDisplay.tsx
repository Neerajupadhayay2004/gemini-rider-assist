import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Gauge, Activity, Move } from 'lucide-react';

interface SensorData {
  acceleration: { x: number; y: number; z: number };
  gyroscope: { alpha: number; beta: number; gamma: number };
  speed: number;
}

const SensorDisplay = () => {
  const [sensorData, setSensorData] = useState<SensorData>({
    acceleration: { x: 0, y: 0, z: 0 },
    gyroscope: { alpha: 0, beta: 0, gamma: 0 },
    speed: 0
  });
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const requestSensorPermission = async () => {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceMotionEvent as any).requestPermission();
          setHasPermission(permission === 'granted');
        } catch (error) {
          console.error('Sensor permission error:', error);
        }
      } else {
        setHasPermission(true);
      }
    };

    requestSensorPermission();
  }, []);

  useEffect(() => {
    if (!hasPermission) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (acc) {
        setSensorData(prev => {
          const newData = {
            ...prev,
            acceleration: {
              x: acc.x || 0,
              y: acc.y || 0,
              z: acc.z || 0
            }
          };
          
          // Dispatch event for voice assistant
          window.dispatchEvent(new CustomEvent('sensorUpdate', { detail: newData }));
          return newData;
        });
      }
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      setSensorData(prev => {
        const newData = {
          ...prev,
          gyroscope: {
            alpha: event.alpha || 0,
            beta: event.beta || 0,
            gamma: event.gamma || 0
          }
        };
        
        // Dispatch event for voice assistant
        window.dispatchEvent(new CustomEvent('sensorUpdate', { detail: newData }));
        return newData;
      });
    };

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [hasPermission]);

  const getAccelerationMagnitude = () => {
    const { x, y, z } = sensorData.acceleration;
    return Math.sqrt(x * x + y * y + z * z).toFixed(2);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="glass-card p-6 neon-border">
        <div className="flex items-center gap-3 mb-4">
          <Gauge className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-semibold neon-text">Acceleration</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">X:</span>
            <span className="font-mono text-primary">{sensorData.acceleration.x.toFixed(2)} m/s²</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Y:</span>
            <span className="font-mono text-primary">{sensorData.acceleration.y.toFixed(2)} m/s²</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Z:</span>
            <span className="font-mono text-primary">{sensorData.acceleration.z.toFixed(2)} m/s²</span>
          </div>
          <div className="pt-2 border-t border-border">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Magnitude:</span>
              <span className="font-mono text-secondary font-bold">{getAccelerationMagnitude()} m/s²</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="glass-card p-6 neon-border">
        <div className="flex items-center gap-3 mb-4">
          <Move className="w-6 h-6 text-secondary" />
          <h3 className="text-lg font-semibold neon-text">Gyroscope</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Alpha:</span>
            <span className="font-mono text-secondary">{sensorData.gyroscope.alpha.toFixed(2)}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Beta:</span>
            <span className="font-mono text-secondary">{sensorData.gyroscope.beta.toFixed(2)}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gamma:</span>
            <span className="font-mono text-secondary">{sensorData.gyroscope.gamma.toFixed(2)}°</span>
          </div>
        </div>
      </Card>

      <Card className="glass-card p-6 neon-border">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-6 h-6 text-accent" />
          <h3 className="text-lg font-semibold neon-text">Activity</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Status:</span>
              <span className="text-accent font-semibold">Monitoring</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sensors Active:</span>
            <span className="text-accent font-bold">{hasPermission ? '✓ Online' : '✗ Offline'}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SensorDisplay;
