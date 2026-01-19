// Service Worker Manager for EcoRider AI
export interface CacheStatus {
  entries: number;
  size: number;
  caches: string[];
}

export interface MapTile {
  url: string;
  x: number;
  y: number;
  z: number;
}

export interface CachedRoute {
  id: string;
  name: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  waypoints: Array<{ lat: number; lng: number }>;
  distance: number;
  duration: number;
  cachedAt: number;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = 'serviceWorker' in navigator;

  async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[SWM] Service Worker not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[SWM] Service Worker registered:', this.registration.scope);

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SWM] New content available, refresh to update');
              this.notifyUpdate();
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.error('[SWM] Registration failed:', error);
      return false;
    }
  }

  private notifyUpdate() {
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  }

  async unregister(): Promise<boolean> {
    if (this.registration) {
      return await this.registration.unregister();
    }
    return false;
  }

  private sendMessage<T>(message: any): Promise<T> {
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      navigator.serviceWorker.controller?.postMessage(message, [messageChannel.port2]);
    });
  }

  async cacheMapTiles(tiles: MapTile[]): Promise<void> {
    if (!navigator.serviceWorker.controller) {
      console.warn('[SWM] No active service worker');
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_MAP_TILES',
      tiles
    });
  }

  async cacheRoute(route: CachedRoute): Promise<void> {
    if (!navigator.serviceWorker.controller) {
      console.warn('[SWM] No active service worker');
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_ROUTE',
      route
    });
  }

  async getCacheStatus(): Promise<CacheStatus> {
    if (!navigator.serviceWorker.controller) {
      return { entries: 0, size: 0, caches: [] };
    }

    return this.sendMessage<CacheStatus>({ type: 'GET_CACHE_STATUS' });
  }

  async clearMapCache(): Promise<boolean> {
    if (!navigator.serviceWorker.controller) {
      return false;
    }

    const result = await this.sendMessage<{ success: boolean }>({ type: 'CLEAR_MAP_CACHE' });
    return result.success;
  }

  async getStorageEstimate(): Promise<{ usage: number; quota: number; percent: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percent = quota > 0 ? (usage / quota) * 100 : 0;
      return { usage, quota, percent };
    }
    return { usage: 0, quota: 0, percent: 0 };
  }

  async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persist();
      console.log('[SWM] Persistent storage:', isPersisted ? 'granted' : 'denied');
      return isPersisted;
    }
    return false;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const swManager = new ServiceWorkerManager();
