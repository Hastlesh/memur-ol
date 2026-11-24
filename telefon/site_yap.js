/* Herkese açık site (GitHub Pages, docs/): telefon/sartim-tamam.html → docs/index.html
   + ilanlar.json, manifest (ana ekrana ekle), service worker (çevrimdışı açılış).
   Önce: node yukleyici/ilanlar_yap.js ; node telefon/yap.js */
const fs = require('fs'), path = require('path');
const K = path.join(__dirname, '..'), D = path.join(K, 'docs');
fs.mkdirSync(D, { recursive: true });
const govde = fs.readFileSync(path.join(__dirname, 'sartim-tamam.html'), 'utf8').replace(/^<title>.*?<\/title>\s*/s, '');
let html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{{CSP}}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>Memur Ol · Sana uygun kamu ilanları</title>
<meta name="description" content="Okulunu, KPSS puanını ve bilgilerini gir; açık kamu ilanlarından sana uyan pozisyonları şart şart göster. Ücretsiz, hesap yok.">
<meta name="theme-color" content="#4b23a0">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="ikon-192.png">
<link rel="apple-touch-icon" href="ikon-192.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Memur Ol">
</head><body>
${govde}
<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});</script>
</body></html>
`;
html = require('./csp').cspEkle(html, { ek: "worker-src 'self'; manifest-src 'self'" });
fs.writeFileSync(path.join(D, 'index.html'), html);
fs.copyFileSync(path.join(__dirname, 'ilanlar.json'), path.join(D, 'ilanlar.json'));
fs.writeFileSync(path.join(D, 'manifest.webmanifest'), JSON.stringify({
  name: 'Memur Ol', short_name: 'Memur Ol', description: 'Sana uygun kamu ilanları',
  start_url: './', scope: './', display: 'standalone', background_color: '#f5f3f9', theme_color: '#4b23a0', lang: 'tr',
  icons: [{ src: 'ikon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'ikon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }]
}, null, 1));
// Önce internetten (güncel ilanlar), yoksa önbellekten
const surum = Date.now();
fs.writeFileSync(path.join(D, 'sw.js'), `const ON='st-${surum}';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(ON).then(c=>Promise.all(['./','ilanlar.json','manifest.webmanifest','ikon-192.png'].map(u=>c.add(u).catch(()=>{})))))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(L=>Promise.all(L.filter(k=>k!==ON).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
e.respondWith(fetch(e.request).then(r=>{const k=r.clone();caches.open(ON).then(c=>c.put(u.pathname.endsWith('ilanlar.json')?'ilanlar.json':e.request,k));return r}).catch(()=>caches.match(u.pathname.endsWith('ilanlar.json')?'ilanlar.json':e.request).then(r=>r||caches.match('./'))))});
`);
fs.writeFileSync(path.join(D, '.nojekyll'), '');
console.log('site:', Math.round(Buffer.byteLength(html) / 1024) + ' KB sayfa,', Math.round(fs.statSync(path.join(D, 'ilanlar.json')).size / 1024) + ' KB ilan');
