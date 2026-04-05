// ── Bump this version every time you deploy ──────────────────
const CACHE_VERSION = 'studyflow-v10';
// ─────────────────────────────────────────────────────────────

const STATIC_ASSETS = [
  'manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js',
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,600;1,9..144,400&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
];

const BYPASS_HOSTS = [
  'supabase.co', 'supabase.io',
  'groq.com', 'api.groq.com',
  'anthropic.com',
  'generativelanguage.googleapis.com',
  'accounts.google.com', 'oauth2.googleapis.com',
  'jsdelivr.net',  // supabase-js CDN — ne pas intercepter
];

function shouldBypass(url) {
  return BYPASS_HOSTS.some(h => url.hostname.includes(h));
}

function isHTMLNavigation(request) {
  return request.mode === 'navigate' ||
         (request.headers.get('accept') || '').includes('text/html');
}

// INSTALL: cache static assets (NOT index.html — always fetch fresh)
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      )
    )
  );
});

// ACTIVATE: delete ALL old caches, claim all tabs immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept API / auth calls
  if (shouldBypass(url)) return;
  if (event.request.method !== 'GET') return;

  // HTML navigation → NETWORK FIRST (always get latest index.html)
  if (isHTMLNavigation(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE_VERSION)
              .then(cache => cache.put(event.request, response.clone()))
              .catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then(cached => cached || caches.match('index.html'))
        )
    );
    return;
  }

  // Static assets → cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && response.type !== 'opaque') {
          caches.open(CACHE_VERSION)
            .then(cache => cache.put(event.request, response.clone()))
            .catch(() => {});
        }
        return response;
      }).catch(() => undefined);
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
