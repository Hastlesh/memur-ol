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

// Gizlilik politikası ve kullanım koşulları (Google Play bu adresi ister: https://hastlesh.github.io/memur-ol/gizlilik.html)
const gizlilik = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'">
<title>Memur Ol · Gizlilik politikası</title><link rel="icon" href="ikon-192.png">
<style>body{margin:0;background:#f6f4fb;color:#1b1530;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}main{max-width:720px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:1.6em;margin:.2em 0}h2{font-size:1.15em;margin:1.6em 0 .3em}a{color:#4a24b8}.not{background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 6px 18px rgb(36 17 100/.07)}
@media(prefers-color-scheme:dark){body{background:#100c19;color:#f1ecfa}a{color:#b9a2ff}.not{background:#1b1627;box-shadow:none}}</style></head><body><main>
<p><a href="./">← Memur Ol</a></p>
<h1>Gizlilik politikası ve kullanım koşulları</h1>
<p>Yürürlük tarihi: 25 Kasım 2026</p>
<p class="not"><b>Kısaca:</b> Girdiğin bilgiler yalnızca kendi telefonunda saklanır; hesap, kimlik numarası, ad ya da e-posta istenmez. Uygulamanın 3.0 ve sonraki sürümleri <b>reklam</b> gösterir (Google AdMob) ve <b>yalnızca sen izin verirsen</b> anonim kullanım istatistiği gönderir (Google Firebase Analytics). İstatistik izni ilk açılışta sorulur, Profil bölümünden istediğin zaman kapatılır. Web sitesi ve 2.x Android sürümü reklam ve istatistik içermez.</p>
<h2>1. Hangi bilgileri giriyorsun, nerede duruyor?</h2>
<p>Sana uygun ilanları gösterebilmek için mezuniyet, bölüm, KPSS puanı, doğum tarihi, cinsiyet, askerlik durumu, ehliyet, boy-kilo gibi bilgileri girersin. Bu bilgiler <b>yalnızca cihazındaki uygulama hafızasında</b> saklanır; karşılaştırma da cihazında yapılır. Bu bilgiler bize ya da başka birine gönderilmez. Kimlik numarası, ad-soyad, telefon numarası ya da e-posta istenmez.</p>
<p>Android uygulamasında bu bilgiler telefonun bulut yedeğine ve yeni telefona aktarıma da dahil edilmez.</p>
<h2>2. İnternete ne gönderiliyor?</h2>
<p>Uygulama herkese açık ilan listesini ve uygunluk hesap motorunun güncel sürümünü indirir (GitHub Pages: hastlesh.github.io; motor dosyası dijital imzayla doğrulanır). Bu isteklerde senin bilgilerin yer almaz. Her web sitesinde olduğu gibi, bağlantı sırasında IP adresin ve cihaz türün bu sunucuyu işleten GitHub'a görünür; GitHub'ın kendi <a href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener noreferrer">gizlilik bildirimi</a> geçerlidir.</p>
<h2>3. Anonim kullanım istatistiği (isteğe bağlı, 3.0 ve sonrası)</h2>
<p>İlk açılışta "Anonim kullanım istatistiği gönderilsin mi?" diye sorulur. <b>Evet</b> dersen Google Firebase Analytics'e şunlar gönderilir: uygulamanın açılması, bilgi girişinin hangi adımında kalındığı, hangi ilanlara bakıldığı (kurum ve kadro adı), takip/başvuru işaretleri, bildirimleri açıp kapatma, paylaşma; ve kaba gruplar hâlinde <b>yaş aralığı</b> (ör. 25-29), <b>okul düzeyi</b>, <b>bölüm</b>, <b>yaşadığın il</b>, <b>cinsiyet</b>, <b>KPSS puan aralığı</b> (ör. 60-70), ehliyetin olup olmadığı ve kaç ilana uyduğun (aralık olarak).</p>
<p><b>Gönderilmeyenler:</b> adın, kesin doğum tarihin, kesin puanın, kimlik numarası, telefon numarası, e-posta, konum ve reklam kimliği. Firebase her cihaza rastgele bir istatistik kimliği verir; bu kimlik seni tanımlamaz. Bu veriler yalnızca uygulamayı geliştirmek için kullanılır, satılmaz ve reklam için kullanılmaz; Google ile veri paylaşımı ayarları kapalıdır. İzni Profil → <b>Anonim istatistik</b> ile kapatırsan gönderim durur ve cihazdaki istatistik kimliği silinir. Hukuki dayanak: açık rızan (KVKK m.5/1).</p>
<h2>4. Reklamlar (3.0 ve sonrası)</h2>
<p>Uygulama ücretsizdir ve giderleri reklamla karşılanır. Ekranın altında şerit reklam ve ara sıra tam ekran reklam gösterilir; bilgi girişi sırasında ve ilan ayrıntısında şerit reklam gösterilmez. Reklamları Google AdMob sunar. AdMob reklam göstermek, sahtekârlığı önlemek ve ölçüm yapmak için cihazının <b>reklam kimliğini</b>, IP adresini (yaklaşık konum) ve cihaz bilgilerini kullanabilir; ayrıntılar: <a href="https://policies.google.com/technologies/partner-sites?hl=tr" rel="noopener noreferrer">Google'ın iş ortağı sitelerinde veri kullanımı</a>. Android'de kişiselleştirilmiş reklamları <b>Ayarlar → Google → Reklamlar</b> bölümünden kapatabilir ya da reklam kimliğini silebilirsin; iPhone'da Apple'ın takip izni penceresinde izin vermezsen kişiselleştirilmemiş reklam gösterilir. Girdiğin bilgiler (okul, puan, yaş…) reklam için kullanılmaz ve AdMob'a gönderilmez.</p>
<h2>5. İzinler</h2>
<p><b>Bildirim:</b> yalnızca sen açarsan, sana uygun yeni ilan ve son gün hatırlatmaları için. <b>İnternet:</b> ilan listesini indirmek için. <b>Titreşim:</b> dokunma geri bildirimi için. <b>Reklam kimliği (3.0+):</b> yalnız AdMob reklamları için. <b>iPhone:</b> uygulama ilk açılışta Apple'ın "Takip izni" penceresiyle sorar; izin vermezsen reklam kimliği (IDFA) kullanılmaz ve yalnızca kişiselleştirilmemiş reklam gösterilir (Ayarlar › Gizlilik ve Güvenlik › Takip bölümünden değiştirebilirsin). <b>Açılışta çalışma:</b> telefon yeniden başlayınca ilan kontrolünün sürmesi için. Konum, rehber, kamera, mikrofon ya da dosyalarına erişilmez.</p>
<h2>6. Bilgilerini silmek</h2>
<p>Uygulamada <b>Profil → Bilgilerimi sil</b> ile bütün bilgilerin cihazdan silinir. Uygulamayı kaldırmak da hepsini siler. Bizde senin adına saklanan bir hesap ya da profil yoktur. İstatistik izni verdiysen, izni kapatınca cihazdaki istatistik kimliği silinir; Google Analytics'teki anonim kayıtlar 2 ay sonra kendiliğinden silinir.</p>
<h2>7. Çocuklar</h2>
<p>Uygulama kamu iş ilanlarına başvurabilecek yaştaki yetişkinler içindir ve çocuklardan bilerek bilgi toplamaz.</p>
<h2>8. Resmî uygulama değildir</h2>
<p>Memur Ol resmî bir devlet uygulaması değildir ve hiçbir kamu kurumuyla bağlantısı yoktur. İlanlar <a href="https://www.resmigazete.gov.tr" rel="noopener noreferrer">Resmî Gazete</a>, <a href="https://kariyerkapisi.gov.tr/isealim" rel="noopener noreferrer">Kariyer Kapısı</a> ve kurumların kendi sitelerinde yayımlanan resmî metinlerden derlenir; her ilanda resmî metnin bağlantısı verilir.</p>
<h2>9. Sorumluluk</h2>
<p>Uygunluk sonuçları ilan metinlerinden otomatik çıkarılır ve hatalı ya da eksik olabilir. Uygulama bilgilendirme amaçlıdır; başvuru şartları, tarihleri ve sonuçları için tek geçerli kaynak kurumun yayımladığı resmî ilandır. Başvurmadan önce ilanın aslını okuman gerekir.</p>
<h2>10. Değişiklikler ve iletişim</h2>
<p>Bu politika değişirse bu sayfa güncellenir ve yürürlük tarihi değişir. Soru ve bildirimlerin için: <a href="https://github.com/Hastlesh/memur-ol/issues" rel="noopener noreferrer">github.com/Hastlesh/memur-ol/issues</a></p>
</main></body></html>
`;
fs.writeFileSync(path.join(D, 'gizlilik.html'), gizlilik);
console.log('site:', Math.round(Buffer.byteLength(html) / 1024) + ' KB sayfa,', Math.round(fs.statSync(path.join(D, 'ilanlar.json')).size / 1024) + ' KB ilan');
