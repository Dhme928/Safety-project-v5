const CACHE_NAME = 'safety-observer-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/translations.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

const DB_NAME = 'SafetyObserverOffline';
const DB_VERSION = 1;
const PENDING_STORE = 'pendingObservations';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  if (event.request.method === 'POST' && url.pathname.includes('/api/observations')) {
    event.respondWith(handleOfflineObservation(event.request.clone()));
    return;
  }
  
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => new Response(JSON.stringify({ error: 'Offline', offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        }))
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(response => {
          if (response.ok && event.request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached)
      )
  );
});

async function handleOfflineObservation(request) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch (e) {
    const authHeader = request.headers.get('Authorization');
    const data = await request.json();
    data.pendingSync = true;
    data.timestamp = Date.now();
    data.authToken = authHeader ? authHeader.replace('Bearer ', '') : null;
    
    await savePendingObservation(data);
    
    return new Response(JSON.stringify({
      success: true,
      pending: true,
      message: 'Saved offline. Will sync when connected.'
    }), { headers: { 'Content-Type': 'application/json' } });
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: 'timestamp' });
      }
    };
  });
}

async function savePendingObservation(data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    tx.objectStore(PENDING_STORE).add(data);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getPendingObservations() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readonly');
    const request = tx.objectStore(PENDING_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deletePendingObservation(timestamp) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    tx.objectStore(PENDING_STORE).delete(timestamp);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

self.addEventListener('sync', event => {
  if (event.tag === 'sync-observations') {
    event.waitUntil(syncPendingObservations());
  }
});

async function syncPendingObservations() {
  const pending = await getPendingObservations();
  
  for (const obs of pending) {
    try {
      const token = obs.authToken;
      if (!token) {
        console.log('No auth token for observation:', obs.timestamp);
        continue;
      }
      
      const response = await fetch('/api/observations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(obs)
      });
      
      if (response.ok) {
        await deletePendingObservation(obs.timestamp);
        notifyClients({ type: 'SYNC_SUCCESS', count: 1 });
      }
    } catch (e) {
      console.log('Sync failed for observation:', obs.timestamp);
    }
  }
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage(message));
}

self.addEventListener('message', event => {
  if (event.data === 'SYNC_NOW') {
    syncPendingObservations();
  }
});
