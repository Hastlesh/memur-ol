/* Uygulamanın herkese açık ilan dosyasını üretir: telefon\ilanlar.json
   Kaynak: tarama\durum.json'daki yüklü kayıtlar (kayitlar\<id>.json). Süresi 1 günden fazla geçmiş ilanlar konmaz.
   Sonra sayfa "ilanlar.json" dosyasıyla birlikte aynı adrese yeniden yayınlanır. */
const fs = require('fs'), path = require('path');
const Sure = require(path.join(__dirname, '..', 'sure.js'));
const Bolucu = require(path.join(__dirname, '..', 'bolucu.js'));
const durum = JSON.parse(fs.readFileSync(path.join(__dirname, 'tarama', 'durum.json'), 'utf8'));
const dun = Date.now() - 864e5, L = [], cikan = [];
// elle\<pdf adı>.json: resim olarak basılmış tabloların elle okunmuş hali. Kadrolar, il dağılımı ve genel şartlar buradan gelir.
const ELLE = path.join(__dirname, 'elle');
function elleUygula(k) {
  const pdf = String(k.kaynak || '').split('/').pop().replace(/\.pdf$/, '');
  const f = path.join(ELLE, pdf + '.json');
  if (!pdf || !fs.existsSync(f)) return false;
  const e = JSON.parse(fs.readFileSync(f, 'utf8'));
  const kadrolar = e.kadrolar.map(x => ({ kod: '', bolum: '', ozel: '', cinsiyet: '', diger: [], ...x, adet: x.adet || Object.values(x.iller || {}).reduce((t, n) => t + n, 0) || null }));
  const okunan = kadrolar.reduce((t, x) => t + (+x.adet || 0), 0);
  const harita = kadrolar.map(x => x.iller || null);
  for (const x of kadrolar) delete x.iller;
  k.B = { kadrolar, genel: e.genel, uyari: [e.not], yillar: e.yillar || [], okunan, beklenen: e.toplam || null, saglama: e.toplam ? okunan === e.toplam : false,
    ilHarita: harita, ilUyari: [], ilBagli: harita.filter(Boolean).length, ilTam: harita.every(Boolean) };
  if (e.ad) k.ad = e.ad;
  k.eksik = false; k.elle = true;
  k.uyari = (k.uyari || []).filter(u => !/resim|yazı tanıma/i.test(u));
  return true;
}
let elleSay = 0, genelSay = 0;
for (const id of Object.keys(durum.yuklu)) {
  const f = path.join(__dirname, 'kayitlar', id + '.json');
  if (!fs.existsSync(f)) { cikan.push(id + ' (dosya yok)'); continue }
  const k = JSON.parse(JSON.parse(fs.readFileSync(f, 'utf8')).json);
  const son = Sure.durum(Sure.bul(k.metin)).son;
  if (son && son.zaman.getTime() < dun) { cikan.push(id + ' (süresi geçti)'); continue }
  // Başlık yeni kuralla yeniden çıkarılır (çok satırlı konu başlıkları kesilmesin); elle dosyası varsa onunki geçerli.
  const yeniAd = Bolucu.ilanAdi(k.metin);
  if (!k.duyuru && yeniAd && !/^İlan:/.test(yeniAd) && yeniAd.length >= k.ad.length) k.ad = yeniAd;
  // Genel şartlar güncel kuralla yeniden çıkarılır (eski yüklemelerde bölüm erken kesilmişti)
  if (k.B && k.B.kadrolar) { const g = Bolucu.genelSartlar(k.metin); if (g.length > (k.B.genel || '').length) { k.B.genel = g; genelSay++ } }
  if (elleUygula(k)) elleSay++;
  L.push(k);
}
L.sort((a, b) => (b.eklendi || 0) - (a.eklendi || 0));
const cikti = path.join(__dirname, '..', 'telefon', 'ilanlar.json');
// guncel: uygulamada "son güncelleme" olarak görünür
fs.writeFileSync(cikti, JSON.stringify({ guncel: new Date().toISOString(), ilanlar: L }));
console.log('ilan', L.length, '| elle okunan tablo', elleSay, '| genel şartı yenilenen', genelSay, Math.round(fs.statSync(cikti).size / 1024) + ' KB', cikan.length ? '| çıkan: ' + cikan.join(', ') : '');
