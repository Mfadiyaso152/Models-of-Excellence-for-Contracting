// Local File Cache using IndexedDB with In-Memory fallback
// Prevents high-memory serialization freezing React during Firestore sync

const DB_NAME = 'ModelsAppFileCache';
const STORE_NAME = 'files';

// Declare global property for memory cache fallback
declare global {
  interface Window {
    memoryFileCache?: Record<string, string>;
  }
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeFile(key: string, base64Data: string): Promise<string> {
  if (!key || !base64Data) return '';
  
  // Clean prefix if it is already localdb to prevent loops
  if (key.startsWith('localdb://')) {
    key = key.replace('localdb://', '');
  }

  // Ensure window cache is initialized
  if (typeof window !== 'undefined') {
    if (!window.memoryFileCache) {
      window.memoryFileCache = {};
    }
    window.memoryFileCache[key] = base64Data;
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(base64Data, key);
      request.onsuccess = () => resolve(`localdb://${key}`);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB write failed or blocked, utilizing in-memory cache fallback:', err);
    return `localdb://${key}`;
  }
}

export async function getFile(url: string): Promise<string> {
  if (!url) return '';
  if (!url.startsWith('localdb://')) return url;
  
  const key = url.replace('localdb://', '');
  
  // Try memory cache first for speed
  if (typeof window !== 'undefined' && window.memoryFileCache && window.memoryFileCache[key]) {
    return window.memoryFileCache[key];
  }

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result || '';
        if (result && typeof window !== 'undefined') {
          if (!window.memoryFileCache) window.memoryFileCache = {};
          window.memoryFileCache[key] = result;
        }
        resolve(result || '');
      };
      request.onerror = () => {
        resolve('');
      };
    });
  } catch (err) {
    console.warn('IndexedDB read failed:', err);
    return '';
  }
}
