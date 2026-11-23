/* Resmî Gazete'de olmayan, sadece kurumun kendi sitesinde yayımlanan ilanı metinden ekler.
   Kullanım: node yukleyici/metin_ekle.js <metin.txt> --kaynak <kurum sayfası> --gun YYYYMMDD
   Kayıt kayitlar\<id>.json'a yazılır ve tarama\durum.json'da "yüklü" sayılır (ilanlar_yap.js onu listeye alır). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const K = path.join(__dirname, '..');
const Bolucu = require(path.join(K, 'bolucu.js')), Sure = require(path.join(K, 'sure.js'));
const a = process.argv.slice(2), al = n => { const i = a.indexOf(n); return i >= 0 ? a.splice(i, 2)[1] : '' };
const kaynak = al('--kaynak'), gun = al('--gun'), dosya = a[0];
if (!dosya || !kaynak || !/^\d{8}$/.test(gun)) { console.log('Kullanım: node metin_ekle.js metin.txt --kaynak URL --gun YYYYMMDD'); process.exit(1) }
const metin = fs.readFileSync(dosya, 'utf8').replace(/\r\n/g, '\n').trim();
const S = Sure.durum(Sure.bul(metin));
if (!S.son) { console.log('HATA: son başvuru günü metinde bulunamadı.'); process.exit(2) }
const ad = Bolucu.ilanAdi(metin);
const id = ad.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
  + '-' + crypto.createHash('sha1').update(metin).digest('hex').slice(0, 8);
const kayit = { id, eklendi: Date.now(), ad, kaynak, metin, B: null, uyari: ['Bu ilan Resmî Gazete\'de değil, kurumun kendi sitesinde yayımlandı.'], eksik: false };
fs.writeFileSync(path.join(__dirname, 'kayitlar', id + '.json'), JSON.stringify({ json: JSON.stringify(kayit) }));
const DF = path.join(__dirname, 'tarama', 'durum.json'), durum = JSON.parse(fs.readFileSync(DF, 'utf8'));
const ilk = metin.split('\n').find(s => s.trim()) || '';
durum.yuklu[id] = { ad: 'site-' + id, gun, anahtar: ilk.toLocaleLowerCase('tr-TR').split(':')[0].trim(), kurum: ad, son: S.son.zaman.toISOString().slice(0, 10), url: kaynak };
fs.writeFileSync(DF, JSON.stringify(durum, null, 0));
console.log('eklendi:', id, '|', ad, '| son gün', S.son.zaman.toLocaleString('tr-TR'));
