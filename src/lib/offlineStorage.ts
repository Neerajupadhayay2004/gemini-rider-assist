// Offline Storage Manager using IndexedDB
const DB_NAME = 'RiderGuardDB';
const DB_VERSION = 1;

interface StoredCommand {
  id?: number;
  text: string;
  timestamp: number;
  synced: boolean;
}

interface StoredSensorData {
  id?: number;
  acceleration: { x: number; y: number; z: number };
  gyroscope: { alpha: number; beta: number; gamma: number };
  location?: { latitude: number; longitude: number; speed: number | null };
  timestamp: number;
  synced: boolean;
}

interface EmergencyContact {
  id?: number;
  name: string;
  phone: string;
  email?: string;
}

class OfflineStorageManager {
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
        
        // Voice commands store
        if (!db.objectStoreNames.contains('voiceCommands')) {
          const commandStore = db.createObjectStore('voiceCommands', { keyPath: 'id', autoIncrement: true });
          commandStore.createIndex('timestamp', 'timestamp');
          commandStore.createIndex('synced', 'synced');
        }

        // Sensor data store
        if (!db.objectStoreNames.contains('sensorData')) {
          const sensorStore = db.createObjectStore('sensorData', { keyPath: 'id', autoIncrement: true });
          sensorStore.createIndex('timestamp', 'timestamp');
          sensorStore.createIndex('synced', 'synced');
        }

        // Emergency contacts store
        if (!db.objectStoreNames.contains('emergencyContacts')) {
          db.createObjectStore('emergencyContacts', { keyPath: 'id', autoIncrement: true });
        }

        // Trip history store
        if (!db.objectStoreNames.contains('tripHistory')) {
          const tripStore = db.createObjectStore('tripHistory', { keyPath: 'id', autoIncrement: true });
          tripStore.createIndex('startTime', 'startTime');
        }
      };
    });
  }

  // Voice Commands
  async saveVoiceCommand(text: string): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction('voiceCommands', 'readwrite');
    const store = transaction.objectStore('voiceCommands');
    
    await store.add({
      text,
      timestamp: Date.now(),
      synced: navigator.onLine
    });
  }

  async getUnsyncedCommands(): Promise<StoredCommand[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('voiceCommands', 'readonly');
      const store = transaction.objectStore('voiceCommands');
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(false));
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Sensor Data
  async saveSensorData(data: Omit<StoredSensorData, 'id' | 'timestamp' | 'synced'>): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction('sensorData', 'readwrite');
    const store = transaction.objectStore('sensorData');
    
    await store.add({
      ...data,
      timestamp: Date.now(),
      synced: false
    });
  }

  async getRecentSensorData(limit: number = 100): Promise<StoredSensorData[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('sensorData', 'readonly');
      const store = transaction.objectStore('sensorData');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const results = request.result.slice(-limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Emergency Contacts
  async saveEmergencyContact(contact: Omit<EmergencyContact, 'id'>): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction('emergencyContacts', 'readwrite');
    const store = transaction.objectStore('emergencyContacts');
    
    await store.add(contact);
  }

  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('emergencyContacts', 'readonly');
      const store = transaction.objectStore('emergencyContacts');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteEmergencyContact(id: number): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction('emergencyContacts', 'readwrite');
    const store = transaction.objectStore('emergencyContacts');
    await store.delete(id);
  }

  // Clear old data
  async clearOldData(daysOld: number = 7): Promise<void> {
    if (!this.db) await this.init();
    
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    const transaction = this.db!.transaction(['voiceCommands', 'sensorData'], 'readwrite');
    
    const commandStore = transaction.objectStore('voiceCommands');
    const sensorStore = transaction.objectStore('sensorData');
    
    const deleteOldRecords = async (store: IDBObjectStore) => {
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (cursor.value.timestamp < cutoff) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    };

    await deleteOldRecords(commandStore);
    await deleteOldRecords(sensorStore);
  }
}

export const offlineStorage = new OfflineStorageManager();
export type { StoredCommand, StoredSensorData, EmergencyContact };
