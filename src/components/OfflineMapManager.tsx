import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Trash2, 
  MapPin, 
  HardDrive, 
  Wifi, 
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Map,
  Route,
  Clock,
  Loader2
} from 'lucide-react';
import { offlineMapCache, CachedArea, OfflineRoute } from '@/lib/offlineMapCache';
import { swManager } from '@/lib/serviceWorkerManager';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OfflineMapManagerProps {
  locationData?: {
    latitude: number;
    longitude: number;
  };
}

const OfflineMapManager = ({ locationData }: OfflineMapManagerProps) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cachedAreas, setCachedAreas] = useState<CachedArea[]>([]);
  const [offlineRoutes, setOfflineRoutes] = useState<OfflineRoute[]>([]);
  const [storageInfo, setStorageInfo] = useState({ usage: 0, quota: 0, percent: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [areaName, setAreaName] = useState('');
  const [radiusKm, setRadiusKm] = useState(2);
  const [swStatus, setSwStatus] = useState<'pending' | 'active' | 'error'>('pending');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize service worker
    initServiceWorker();
    loadCachedData();
    loadStorageInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const initServiceWorker = async () => {
    try {
      const registered = await swManager.register();
      setSwStatus(registered ? 'active' : 'error');
      await swManager.requestPersistentStorage();
    } catch (error) {
      console.error('SW init error:', error);
      setSwStatus('error');
    }
  };

  const loadCachedData = async () => {
    try {
      const areas = await offlineMapCache.getCachedAreas();
      const routes = await offlineMapCache.getOfflineRoutes();
      setCachedAreas(areas);
      setOfflineRoutes(routes);
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const loadStorageInfo = async () => {
    try {
      const info = await swManager.getStorageEstimate();
      setStorageInfo(info);
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  };

  const handleDownloadArea = async () => {
    if (!locationData) {
      toast.error('GPS location required to download map area');
      return;
    }

    const name = areaName.trim() || `Area ${cachedAreas.length + 1}`;
    
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const area = await offlineMapCache.cacheArea(
        name,
        locationData.latitude,
        locationData.longitude,
        radiusKm,
        [14, 15, 16]
      );

      clearInterval(progressInterval);
      setDownloadProgress(100);

      setCachedAreas(prev => [...prev, area]);
      await loadStorageInfo();
      
      toast.success(`Downloaded "${name}" for offline use`);
      setAreaName('');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download map area');
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadProgress(0), 1000);
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    try {
      await offlineMapCache.deleteCachedArea(areaId);
      setCachedAreas(prev => prev.filter(a => a.id !== areaId));
      await loadStorageInfo();
      toast.success('Deleted cached area');
    } catch (error) {
      toast.error('Failed to delete area');
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    try {
      await offlineMapCache.deleteOfflineRoute(routeId);
      setOfflineRoutes(prev => prev.filter(r => r.id !== routeId));
      toast.success('Deleted offline route');
    } catch (error) {
      toast.error('Failed to delete route');
    }
  };

  const handleClearAll = async () => {
    try {
      await offlineMapCache.clearAllCache();
      await swManager.clearMapCache();
      setCachedAreas([]);
      setOfflineRoutes([]);
      await loadStorageInfo();
      toast.success('Cleared all cached data');
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="glass-card neon-border">
      <CardHeader className="bg-gradient-to-r from-primary/20 to-secondary/20 py-2 sm:py-3 px-3 sm:px-4">
        <CardTitle className="flex items-center justify-between text-foreground text-sm sm:text-base">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <span>Offline Maps</span>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge className="bg-success/20 text-success border-success/30 text-[10px] sm:text-xs">
                <Wifi className="w-3 h-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge className="bg-destructive/20 text-destructive border-destructive/30 animate-pulse text-[10px] sm:text-xs">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
            {swStatus === 'active' && (
              <Badge variant="outline" className="text-[10px] sm:text-xs border-primary/30">
                <CheckCircle className="w-3 h-3 mr-1 text-primary" />
                SW Active
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 space-y-4">
        {/* Storage Info */}
        <div className="glass-card rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Storage Used</span>
            <span className="font-mono text-foreground">
              {formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}
            </span>
          </div>
          <Progress value={storageInfo.percent} className="h-1.5" />
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {cachedAreas.length} areas • {offlineRoutes.length} routes cached
          </p>
        </div>

        {/* Download New Area */}
        <div className="space-y-3">
          <h4 className="text-xs sm:text-sm font-semibold flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            Download Current Area
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Area name (optional)"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              className="text-sm h-9"
            />
            <div className="flex gap-2">
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="flex-1 h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value={1}>1 km</option>
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
              </select>
              <Button
                onClick={handleDownloadArea}
                disabled={isDownloading || !locationData}
                size="sm"
                className="h-9"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {isDownloading && (
            <div className="space-y-1">
              <Progress value={downloadProgress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground text-center">
                Downloading... {downloadProgress}%
              </p>
            </div>
          )}

          {!locationData && (
            <p className="text-[10px] sm:text-xs text-warning flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Enable GPS to download map for current location
            </p>
          )}
        </div>

        {/* Cached Areas */}
        {cachedAreas.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-semibold flex items-center gap-2">
              <Map className="w-4 h-4 text-primary" />
              Cached Areas
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {cachedAreas.map((area) => (
                <div
                  key={area.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{area.name}</p>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                      <span>{area.radius} km radius</span>
                      <span>•</span>
                      <span>{area.tileCount} tiles</span>
                      <span>•</span>
                      <span>{formatBytes(area.size)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteArea(area.id)}
                    className="w-7 h-7 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offline Routes */}
        {offlineRoutes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-semibold flex items-center gap-2">
              <Route className="w-4 h-4 text-primary" />
              Saved Routes
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {offlineRoutes.map((route) => (
                <div
                  key={route.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{route.name}</p>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                      <span>{(route.distance / 1000).toFixed(1)} km</span>
                      <span>•</span>
                      <span>{Math.round(route.duration / 60)} min</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(route.cachedAt)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteRoute(route.id)}
                    className="w-7 h-7 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadCachedData}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
          
          {(cachedAreas.length > 0 || offlineRoutes.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OfflineMapManager;
