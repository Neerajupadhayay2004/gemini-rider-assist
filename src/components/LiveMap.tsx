import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Map, 
  Navigation2, 
  Locate, 
  ZoomIn, 
  ZoomOut,
  Compass,
  MapPin,
  AlertTriangle
} from 'lucide-react';

interface LiveMapProps {
  locationData?: {
    latitude: number;
    longitude: number;
    speed: number | null;
    accuracy?: number;
  };
  hazards?: Array<{
    id: string;
    type: string;
    lat: number;
    lng: number;
    severity: 'low' | 'medium' | 'high';
  }>;
}

const LiveMap = ({ locationData, hazards = [] }: LiveMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(15);
  const [heading, setHeading] = useState(0);
  const [trail, setTrail] = useState<{x: number, y: number}[]>([]);

  // Convert GPS to canvas coordinates (simplified)
  const gpsToCanvas = (lat: number, lng: number, centerLat: number, centerLng: number, canvasWidth: number, canvasHeight: number) => {
    const scale = zoom * 50;
    const x = canvasWidth / 2 + (lng - centerLng) * scale;
    const y = canvasHeight / 2 - (lat - centerLat) * scale;
    return { x, y };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !locationData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw dark background with grid
    ctx.fillStyle = 'hsl(240, 10%, 8%)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'hsl(180, 50%, 15%)';
    ctx.lineWidth = 0.5;
    const gridSize = 30;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw concentric circles (radar effect)
    const centerX = width / 2;
    const centerY = height / 2;
    
    for (let r = 50; r < Math.max(width, height); r += 50) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(180, 100%, 50%, ${0.1 - r * 0.0003})`;
      ctx.stroke();
    }

    // Draw trail
    if (trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      trail.forEach((point, i) => {
        if (i > 0) {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.strokeStyle = 'hsla(180, 100%, 50%, 0.3)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Draw hazards
    hazards.forEach(hazard => {
      const pos = gpsToCanvas(hazard.lat, hazard.lng, locationData.latitude, locationData.longitude, width, height);
      
      const colors = {
        low: 'hsl(45, 100%, 50%)',
        medium: 'hsl(30, 100%, 50%)',
        high: 'hsl(0, 100%, 50%)'
      };
      
      // Hazard marker
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = colors[hazard.severity];
      ctx.fill();
      
      // Pulse effect
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15 + Math.sin(Date.now() / 200) * 5, 0, Math.PI * 2);
      ctx.strokeStyle = colors[hazard.severity];
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw current position (center)
    // Outer glow
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
    gradient.addColorStop(0, 'hsla(180, 100%, 50%, 0.8)');
    gradient.addColorStop(0.5, 'hsla(180, 100%, 50%, 0.2)');
    gradient.addColorStop(1, 'hsla(180, 100%, 50%, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator (arrow)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((heading * Math.PI) / 180);
    
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(-10, 10);
    ctx.lineTo(0, 5);
    ctx.lineTo(10, 10);
    ctx.closePath();
    ctx.fillStyle = 'hsl(180, 100%, 50%)';
    ctx.fill();
    ctx.strokeStyle = 'hsl(180, 100%, 70%)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();

    // Draw accuracy circle
    if (locationData.accuracy) {
      const accuracyRadius = Math.min(locationData.accuracy * 2, 100);
      ctx.beginPath();
      ctx.arc(centerX, centerY, accuracyRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'hsla(180, 100%, 50%, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Coordinates display
    ctx.fillStyle = 'hsl(180, 100%, 95%)';
    ctx.font = '12px monospace';
    ctx.fillText(`${locationData.latitude.toFixed(6)}°N`, 10, height - 30);
    ctx.fillText(`${locationData.longitude.toFixed(6)}°E`, 10, height - 15);

    // Update trail
    setTrail(prev => {
      const newTrail = [...prev, { x: centerX, y: centerY }];
      return newTrail.slice(-50);
    });

  }, [locationData, zoom, heading, hazards]);

  // Simulate heading changes based on gyroscope
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) {
        setHeading(e.alpha);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  return (
    <Card className="glass-card neon-border overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/20 to-secondary/20 py-3">
        <CardTitle className="flex items-center gap-3 text-foreground text-base">
          <Map className="w-5 h-5 text-primary" />
          Live Map
          <Badge variant="outline" className="ml-auto bg-primary/20 text-primary border-primary text-xs">
            <Navigation2 className="w-3 h-3 mr-1" />
            Tracking
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          className="w-full h-64 md:h-80"
        />
        
        {/* Map Controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setZoom(z => Math.min(20, z + 1))}
            className="w-8 h-8 bg-background/80 border-border"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setZoom(z => Math.max(10, z - 1))}
            className="w-8 h-8 bg-background/80 border-border"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="w-8 h-8 bg-background/80 border-border"
          >
            <Locate className="w-4 h-4" />
          </Button>
        </div>

        {/* Compass */}
        <div className="absolute top-2 left-2 w-10 h-10 bg-background/80 rounded-full flex items-center justify-center border border-border">
          <Compass 
            className="w-6 h-6 text-primary transition-transform duration-300" 
            style={{ transform: `rotate(${-heading}deg)` }}
          />
        </div>

        {/* Speed Indicator */}
        {locationData?.speed && (
          <div className="absolute bottom-2 right-2 bg-background/80 px-3 py-1 rounded-lg border border-border">
            <p className="text-lg font-bold text-primary">{Math.round(locationData.speed)} km/h</p>
          </div>
        )}

        {/* Hazard Legend */}
        {hazards.length > 0 && (
          <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded-lg border border-border">
            <div className="flex items-center gap-1 text-xs">
              <AlertTriangle className="w-3 h-3 text-warning" />
              <span className="text-warning">{hazards.length} hazards</span>
            </div>
          </div>
        )}

        {!locationData && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-bounce" />
              <p className="text-sm text-muted-foreground">GPS सिग्नल की प्रतीक्षा...</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveMap;
