// My Aquarium — keeps a copy of the game on the phone so it opens offline.
// Change VERSION whenever fonts or icons change; index.html is always fetched fresh when online.
const VERSION = 'aq-3.6-1';
const FILES = [
  './', './index.html', './manifest.webmanifest',
  './fonts/vt323-latin.woff2', './fonts/press-start-2p-latin.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const save = (req, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // The game page: the newest version when online (gives up after 4 s), the saved copy when offline.
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
    const fromNet = fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }).then(res => save('./index.html', res));
    const fromCache = () => caches.match('./index.html');
    e.respondWith(
      Promise.race([fromNet, new Promise((_, no) => setTimeout(no, 4000))])
        .catch(() => fromCache().then(m => m || fromNet))
    );
    return;
  }

  // Fonts, icons, the manifest: the saved copy first.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(m => m || fetch(req).then(res => save(req, res))));
});
