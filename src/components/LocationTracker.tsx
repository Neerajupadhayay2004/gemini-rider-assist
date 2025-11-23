import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
}

const LocationTracker = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Supported",
        description: "Your device doesn't support geolocation",
        variant: "destructive",
      });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
        });
        setIsTracking(true);
      },
      (error) => {
        console.error('Location error:', error);
        toast({
          title: "Location Error",
          description: "Unable to access your location. Please enable location services.",
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [toast]);

  return (
    <Card className="glass-card p-6 neon-border glow-pulse">
      <div className="flex items-center gap-3 mb-6">
        <MapPin className="w-8 h-8 text-primary" />
        <h2 className="text-2xl font-bold gradient-text">Live Location</h2>
      </div>

      {location ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Coordinates</span>
              </div>
              <div className="font-mono text-lg">
                <div className="text-primary">{location.latitude.toFixed(6)}°N</div>
                <div className="text-secondary">{location.longitude.toFixed(6)}°E</div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Accuracy</span>
              <div className="font-mono text-2xl text-accent">
                ±{location.accuracy.toFixed(0)}m
              </div>
            </div>
          </div>

          {location.speed !== null && (
            <div className="pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">Current Speed</span>
              <div className="font-mono text-3xl text-primary">
                {(location.speed * 3.6).toFixed(1)} km/h
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-primary">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>GPS Active</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Acquiring GPS signal...</p>
        </div>
      )}
    </Card>
  );
};

export default LocationTracker;
