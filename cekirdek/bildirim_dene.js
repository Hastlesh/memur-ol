/* Deneme sürümünde (com.celikgames.memurol.deneme) bildirimi zorla dener:
   "görülen ilanlar" listesini boşaltır → arka plan işi tüm uygun/kontrol pozisyonlarını "yeni" sayar ve bildirir.
   Kullanım: node cekirdek\bildirim_dene.js   (telefon USB'de, uygulama en az bir kez açılmış olmalı) */
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const ADB = path.join(__dirname, '..', 'android', 'arac', 'sdk', 'platform-tools', 'adb.exe'), P = 'com.celikgames.memurol.deneme';
const adb = (...a) => execFileSync(ADB, a, { maxBuffer: 64 << 20 }).toString('utf8');
const bekle = ms => execFileSync(process.execPath, ['-e', `setTimeout(()=>{},${ms})`]);
// 1) Uygulamayı başlat (zorla durdurma iptal ettiği işi WorkManager yeniden kaydetsin), sonra arka plana al
adb('shell', 'am', 'start', '-n', `${P}/com.celikgames.memurol.MainActivity`); bekle(8000);
adb('shell', 'am', 'start', '-a', 'android.settings.SETTINGS'); bekle(2000);   // Xiaomi tuş basmayı engeller: Ayarlar'ı açarak arka plana al
// 2) Görülen listesini boşalt (uygulama arka planda; SharedPreferences dosyası değiştirilir)
let x = adb('exec-out', 'run-as', P, 'cat', 'shared_prefs/memurol.xml');
const once = (x.match(/<string name="bildirilen">([\s\S]*?)<\/string>/) || [])[1];
console.log('önce bildirilen:', once ? once.length + ' karakter' : 'yok');
x = x.replace(/<string name="bildirilen">[\s\S]*?<\/string>/, '<string name="bildirilen">[]</string>');
const yerel = path.join(os.tmpdir(), 'memurol_prefs.xml'); fs.writeFileSync(yerel, x);
adb('push', yerel, '/data/local/tmp/m.xml'); adb('shell', `chmod 644 /data/local/tmp/m.xml; run-as ${P} cp /data/local/tmp/m.xml shared_prefs/memurol.xml; rm /data/local/tmp/m.xml`);
// 3) Uygulama süreci eski listeyi bellekte tutmasın: süreci öldür (am kill işleri silmez), işi zorla çalıştır
adb('shell', 'am', 'kill', P); bekle(1500);
const is_ = (adb('shell', 'dumpsys', 'jobscheduler').match(new RegExp(`JOB #u0a\\d+/(\\d+): \\S+ ${P.replace(/\./g, '\\.')}/`)) || [])[1];
if (!is_) { console.log('arka plan işi bulunamadı (bildirim kapalı olabilir)'); process.exit(1) }
console.log('iş', is_, adb('shell', 'cmd', 'jobscheduler', 'run', '-f', P, is_).trim()); bekle(30000);
// 4) Sonuç: uygulamanın bildirimleri
const tum = adb('shell', 'dumpsys', 'notification', '--noredact');
const parcalar = tum.split(`pkg=${P} `).slice(1).map(b => b.slice(0, 6000));
console.log(`${P} bildirimleri: ${parcalar.length}`);
for (const b of parcalar) { const t = (b.match(/android\.title=String \(([^\n]*)\)/) || [])[1], m = (b.match(/android\.bigText=String \(([^\n]*)/) || b.match(/android\.text=String \(([^\n]*)/) || [])[1]; console.log('—', t, '|', (m || '').slice(0, 200)) }
