import { useState, useEffect } from 'react';
import { WifiOff, Wifi, Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { offlineStorage } from '@/lib/offlineStorage';
import { useVibration } from '@/hooks/useVibration';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingData, setPendingData] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const { patterns } = useVibration();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      patterns.success();
      toast({
        title: "Back Online",
        description: "Connection restored. Syncing data...",
      });
      syncData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      patterns.warning();
      toast({
        title: "Offline Mode",
        description: "You're offline. Data will be saved locally.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending data count
    checkPendingData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkPendingData = async () => {
    try {
      const commands = await offlineStorage.getUnsyncedCommands();
      setPendingData(commands.length);
    } catch (error) {
      console.error('Error checking pending data:', error);
    }
  };

  const syncData = async () => {
    setSyncing(true);
    try {
      const commands = await offlineStorage.getUnsyncedCommands();
      
      if (commands.length > 0) {
        // In a real app, sync to server here
        console.log('Syncing', commands.length, 'commands');
        
        // Simulate sync delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast({
          title: "Sync Complete",
          description: `${commands.length} items synced successfully`,
        });
      }
      
      setPendingData(0);
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Move to left side to avoid conflict with theme toggle
  return (
    <div className={`fixed top-4 left-4 z-50 flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full glass-card neon-border transition-all ${
      isOnline ? 'border-success/50' : 'border-destructive/50 animate-pulse'
    }`}>
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
          <span className="text-xs sm:text-sm font-medium text-success hidden sm:inline">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
          <span className="text-xs sm:text-sm font-medium text-destructive hidden sm:inline">Offline</span>
        </>
      )}

      {pendingData > 0 && (
        <div className="flex items-center gap-1 sm:gap-2 ml-1 sm:ml-2 pl-1 sm:pl-2 border-l border-border">
          <Database className="w-3 h-3 sm:w-4 sm:h-4 text-warning" />
          <span className="text-[10px] sm:text-xs text-warning">{pendingData}</span>
          
          {isOnline && (
            <Button
              variant="ghost"
              size="icon"
              onClick={syncData}
              disabled={syncing}
              className="w-5 h-5 sm:w-6 sm:h-6"
            >
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
