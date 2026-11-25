/* Deneme uygulamasının (com.celikgames.memurol.deneme) telefondaki profilini ve ilan listesini okur, çekirdekle hesaplar.
   Kullanım: node cekirdek\telefon_profil.js [düzelt]   ("düzelt": puanlara eksik tür/yıl eklenir) */
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const ADB = path.join(__dirname, '..', 'android', 'arac', 'sdk', 'platform-tools', 'adb.exe');
const x = execFileSync(ADB, ['exec-out', 'run-as', 'com.celikgames.memurol.deneme', 'cat', 'shared_prefs/memurol.xml'], { maxBuffer: 64 << 20 }).toString('utf8');
const dec = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#10;/g, '\n').replace(/&amp;/g, '&');
const al = n => { const m = x.match(new RegExp('<string name="' + n + '">([\\s\\S]*?)</string>')); return m ? dec(m[1]) : null };
const p = JSON.parse(al('profil') || '{}');
if (process.argv[2]) { p.puanlar = (p.puanlar || []).map(a => ({ tur: 'P3', yil: '2026', ...a })); p.genel = true }
console.log('profil:', JSON.stringify(p));
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, 'memurol-cekirdek.js'), 'utf8'), ctx);
const ilanlar = JSON.stringify(JSON.parse(al('ilanlar') || fs.readFileSync(path.join(__dirname, '..', 'telefon', 'ilanlar.json'), 'utf8')).ilanlar);
const r = JSON.parse(ctx.MemurOlCekirdek.hesapla(ilanlar, JSON.stringify(p), null));
for (const g of ['uygun', 'bak']) {
  const L = r.ilanlar.flatMap(i => i.pozisyonlar.filter(z => z.grup === g).map(z => `${i.kurumKisa} | ${z.ad} | ${z.neden}`));
  console.log(`## ${g}: ${L.length}`); L.forEach(s => console.log('   ' + s.slice(0, 220)));
}
