const CACHE_NAME = 'studyflow-v8';
const STATIC_ASSETS = [
  'index.html',
  'manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js',
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,600;1,9..144,400&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
];

// These hosts must NEVER be intercepted — Supabase uses non-clonable Headers
// (apikey, Authorization) which cause DataCloneError if the SW touches them.
const BYPASS_HOSTS = [
  'supabase.co',
  'supabase.io',
  'groq.com',
  'api.groq.com',
  'anthropic.com',
  'generativelanguage.googleapis.com',
];

function shouldBypass(url) {
  return BYPASS_HOSTS.some(h => url.hostname.includes(h));
}

// Install
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url).catch(() => {})))
    )
  );
});

// Activate: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Don't call event.respondWith() at all for API calls.
  // Returning without respondWith lets the browser handle it natively,
  // completely avoiding the DataCloneError.
  if (shouldBypass(url)) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          if (response.ok && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, clone))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('index.html');
          }
        });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
