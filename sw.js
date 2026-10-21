// Service worker: aplicația funcționează și fără internet.
// La fiecare modificare a fișierelor, crește VERSION (și APP_VERSION din js/store.js) ca telefoanele să ia versiunea nouă.

const VERSION = 'finante-v57';
const FILES = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  './js/app.js', './js/store.js', './js/db.js', './js/dates.js', './js/fmt.js', './js/calc.js', './js/actions.js', './js/ui.js', './js/charts.js',
  './js/xlsx.js', './js/exporter.js', './js/demo.js', './js/forms.js', './js/components.js', './js/confetti.js', './js/i18n.js', './js/i18n-en.js', './js/heroArt.js', './js/heroColors.js', './js/catIcons.js', './js/menu.js',
  './js/pages/dashboard.js', './js/pages/transactions.js', './js/pages/investments.js', './js/pages/reports.js',
  './js/pages/subscriptions.js', './js/pages/networth.js', './js/pages/emergency.js', './js/pages/debts.js', './js/pages/settings.js',
  './js/pages/categories.js', './js/pages/savings.js', './js/pages/calculator.js', './js/pages/wishlist.js', './js/pages/start.js', './js/pages/homeParts.js', './js/pages/plan.js',
];

self.addEventListener('install', e => {
  // cache: 'reload' = fișierele vin direct de pe server, nu din copia veche a browserului.
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Răspunde imediat din cache și actualizează cache-ul în fundal.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('./index.html') : null);
    const network = fetch(req.url, { cache: 'no-cache' }).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  }));
});
