export interface StoredSample {
  sampleRate: number;
  data: Float32Array;
}

const DB_NAME = 'drumline';
const STORE = 'samples';
const KEY = 'mine';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Every call is safe without IndexedDB: saving silently fails and loading returns null.
export async function saveUserSample(sample: StoredSample): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ sampleRate: sample.sampleRate, data: sample.data }, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // The sample still works for this visit.
  }
}

export async function loadUserSample(): Promise<StoredSample | null> {
  try {
    const db = await open();
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    const record = value as Partial<StoredSample> | undefined;
    if (!record || typeof record.sampleRate !== 'number' || !(record.data instanceof Float32Array)) return null;
    return { sampleRate: record.sampleRate, data: record.data };
  } catch {
    return null;
  }
}
