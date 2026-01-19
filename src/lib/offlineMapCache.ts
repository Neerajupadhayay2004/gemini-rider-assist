// Offline Map Cache Manager using IndexedDB
const DB_NAME = 'EcoRiderMaps';
const DB_VERSION = 1;

export interface CachedMapTile {
  id: string;
  lat: number;
  lng: number;
  zoom: number;
  imageData: string; // Base64 encoded
  timestamp: number;
}

export interface CachedArea {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radius: number; // in km
  zoomLevels: number[];
  tileCount: number;
  size: number; // in bytes
  cachedAt: number;
  lastUsed: number;
}

export interface OfflineRoute {
  id: string;
  name: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  waypoints: Array<{ lat: number; lng: number; instruction?: string }>;
  distance: number;
  duration: number;
  ecoScore: number;
  cachedAt: number;
}

class OfflineMapCacheManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Map tiles store
        if (!db.objectStoreNames.contains('mapTiles')) {
          const tileStore = db.createObjectStore('mapTiles', { keyPath: 'id' });
          tileStore.createIndex('coords', ['lat', 'lng', 'zoom']);
          tileStore.createIndex('timestamp', 'timestamp');
        }

        // Cached areas store
        if (!db.objectStoreNames.contains('cachedAreas')) {
          const areaStore = db.createObjectStore('cachedAreas', { keyPath: 'id' });
          areaStore.createIndex('centerCoords', ['centerLat', 'centerLng']);
        }

        // Offline routes store
        if (!db.objectStoreNames.contains('offlineRoutes')) {
          const routeStore = db.createObjectStore('offlineRoutes', { keyPath: 'id' });
          routeStore.createIndex('cachedAt', 'cachedAt');
        }

        // Location history for map rendering
        if (!db.objectStoreNames.contains('locationHistory')) {
          const histStore = db.createObjectStore('locationHistory', { keyPath: 'id', autoIncrement: true });
          histStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  // Generate tile ID from coordinates
  private getTileId(lat: number, lng: number, zoom: number): string {
    return `${lat.toFixed(4)}_${lng.toFixed(4)}_${zoom}`;
  }

  // Save map tile
  async saveMapTile(lat: number, lng: number, zoom: number, imageData: string): Promise<void> {
    if (!this.db) await this.init();

    const tile: CachedMapTile = {
      id: this.getTileId(lat, lng, zoom),
      lat,
      lng,
      zoom,
      imageData,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('mapTiles', 'readwrite');
      const store = transaction.objectStore('mapTiles');
      const request = store.put(tile);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get map tile
  async getMapTile(lat: number, lng: number, zoom: number): Promise<CachedMapTile | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('mapTiles', 'readonly');
      const store = transaction.objectStore('mapTiles');
      const request = store.get(this.getTileId(lat, lng, zoom));
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Cache area for offline use
  async cacheArea(
    name: string,
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    zoomLevels: number[] = [14, 15, 16]
  ): Promise<CachedArea> {
    if (!this.db) await this.init();

    const areaId = `area_${Date.now()}`;
    const tiles = this.calculateTilesForArea(centerLat, centerLng, radiusKm, zoomLevels);
    
    // Generate and cache tiles
    let totalSize = 0;
    for (const tile of tiles) {
      const imageData = await this.generateTileImage(tile.lat, tile.lng, tile.zoom);
      await this.saveMapTile(tile.lat, tile.lng, tile.zoom, imageData);
      totalSize += imageData.length;
    }

    const cachedArea: CachedArea = {
      id: areaId,
      name,
      centerLat,
      centerLng,
      radius: radiusKm,
      zoomLevels,
      tileCount: tiles.length,
      size: totalSize,
      cachedAt: Date.now(),
      lastUsed: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('cachedAreas', 'readwrite');
      const store = transaction.objectStore('cachedAreas');
      const request = store.put(cachedArea);
      
      request.onsuccess = () => resolve(cachedArea);
      request.onerror = () => reject(request.error);
    });
  }

  // Calculate tiles needed for an area
  private calculateTilesForArea(
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    zoomLevels: number[]
  ): Array<{ lat: number; lng: number; zoom: number }> {
    const tiles: Array<{ lat: number; lng: number; zoom: number }> = [];
    const degPerKm = 1 / 111; // Approximate degrees per km

    for (const zoom of zoomLevels) {
      const step = 0.01 / (zoom / 15); // Adjust step based on zoom
      const latRange = radiusKm * degPerKm;
      const lngRange = radiusKm * degPerKm / Math.cos(centerLat * Math.PI / 180);

      for (let lat = centerLat - latRange; lat <= centerLat + latRange; lat += step) {
        for (let lng = centerLng - lngRange; lng <= centerLng + lngRange; lng += step) {
          tiles.push({ lat, lng, zoom });
        }
      }
    }

    return tiles;
  }

  // Generate a simple tile image (canvas-based visualization)
  private async generateTileImage(lat: number, lng: number, zoom: number): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = 'hsl(160, 15%, 8%)';
    ctx.fillRect(0, 0, 256, 256);

    // Grid pattern
    ctx.strokeStyle = 'hsl(160, 30%, 15%)';
    ctx.lineWidth = 0.5;
    const gridSize = 32;
    for (let x = 0; x < 256; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y < 256; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    // Add some visual elements based on coordinates
    const seed = Math.abs((lat * 1000 + lng * 1000) % 1000);
    ctx.fillStyle = 'hsl(160, 50%, 25%)';
    
    // Simulate roads
    for (let i = 0; i < 3; i++) {
      const x1 = ((seed * (i + 1)) % 256);
      const y1 = ((seed * (i + 2)) % 256);
      ctx.beginPath();
      ctx.moveTo(x1, 0);
      ctx.lineTo((x1 + 50) % 256, 256);
      ctx.strokeStyle = 'hsl(160, 40%, 30%)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Coordinate label
    ctx.fillStyle = 'hsl(160, 50%, 50%)';
    ctx.font = '9px monospace';
    ctx.fillText(`${lat.toFixed(3)}°N`, 5, 245);
    ctx.fillText(`${lng.toFixed(3)}°E`, 5, 255);

    return canvas.toDataURL('image/png');
  }

  // Get all cached areas
  async getCachedAreas(): Promise<CachedArea[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('cachedAreas', 'readonly');
      const store = transaction.objectStore('cachedAreas');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete cached area
  async deleteCachedArea(areaId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('cachedAreas', 'readwrite');
      const store = transaction.objectStore('cachedAreas');
      const request = store.delete(areaId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Save offline route
  async saveOfflineRoute(route: Omit<OfflineRoute, 'id' | 'cachedAt'>): Promise<OfflineRoute> {
    if (!this.db) await this.init();

    const offlineRoute: OfflineRoute = {
      ...route,
      id: `route_${Date.now()}`,
      cachedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('offlineRoutes', 'readwrite');
      const store = transaction.objectStore('offlineRoutes');
      const request = store.put(offlineRoute);
      
      request.onsuccess = () => resolve(offlineRoute);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all offline routes
  async getOfflineRoutes(): Promise<OfflineRoute[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('offlineRoutes', 'readonly');
      const store = transaction.objectStore('offlineRoutes');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete offline route
  async deleteOfflineRoute(routeId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('offlineRoutes', 'readwrite');
      const store = transaction.objectStore('offlineRoutes');
      const request = store.delete(routeId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Save location to history
  async saveLocationHistory(lat: number, lng: number, speed: number | null): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('locationHistory', 'readwrite');
      const store = transaction.objectStore('locationHistory');
      const request = store.add({
        lat,
        lng,
        speed,
        timestamp: Date.now()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get recent location history
  async getLocationHistory(limit: number = 100): Promise<Array<{ lat: number; lng: number; speed: number | null; timestamp: number }>> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('locationHistory', 'readonly');
      const store = transaction.objectStore('locationHistory');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      
      const results: Array<{ lat: number; lng: number; speed: number | null; timestamp: number }> = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results.reverse());
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Clear old location history
  async clearOldLocationHistory(daysOld: number = 7): Promise<void> {
    if (!this.db) await this.init();

    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    return new Promise((resolve) => {
      const transaction = this.db!.transaction('locationHistory', 'readwrite');
      const store = transaction.objectStore('locationHistory');
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  // Get total cache size
  async getTotalCacheSize(): Promise<number> {
    if (!this.db) await this.init();

    const areas = await this.getCachedAreas();
    return areas.reduce((total, area) => total + area.size, 0);
  }

  // Clear all cached data
  async clearAllCache(): Promise<void> {
    if (!this.db) await this.init();

    const stores = ['mapTiles', 'cachedAreas', 'offlineRoutes'];
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(stores, 'readwrite');
      
      for (const storeName of stores) {
        transaction.objectStore(storeName).clear();
      }
      
      transaction.oncomplete = () => resolve();
    });
  }
}

export const offlineMapCache = new OfflineMapCacheManager();
