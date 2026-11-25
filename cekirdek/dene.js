/* Çekirdek denemesi: paket dosyasını telefon JS motoru gibi (module/require olmadan) çalıştırır,
   örnek profillerle hesaplar ve uygun/bak/uymuyor sayılarını yazar.
   Profiller yukleyici\tarama\kontrol.js ile aynı: iki betiğin "uygun" ve "kontrol" sayıları tutmalı.
   Kullanım: node cekirdek\dene.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const kod = fs.readFileSync(path.join(__dirname, 'memurol-cekirdek.js'), 'utf8');
const ctx = vm.createContext({ console });
vm.runInContext(kod, ctx, { filename: 'memurol-cekirdek.js' });
const C = ctx.MemurOlCekirdek;
if (!C) throw new Error('MemurOlCekirdek tanımlanmadı');
const ilanlar = JSON.stringify(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'telefon', 'ilanlar.json'), 'utf8')).ilanlar);
const x = (t, p) => ({ tur: t, puan: p, yil: '2026' });
const ek = { sozlesmeli: 'hayir', fesih: 'hayir', ogrenci: 'degil', emekli: 'hayir', kadrolu: 'hayir', belgeSoruldu: true, belgeler: [], genel: true };
const PROFILLER = {
  'bos': { genel: true },
  'lise E P94 72 B 1999': { okul: 2, bolum: '', puanlar: [x('P94', '72')], dogum: '1999-04-04', cinsiyet: 'E', asker: 'yapti', ehliyet: 'B', ...ek },
  'önlisans K P93 70 Büro Yön. 2000': { okul: 3, bolum: 'Büro Yönetimi ve Yönetici Asistanlığı', puanlar: [x('P93', '70')], dogum: '2000-02-02', cinsiyet: 'K', ehliyet: '', ...ek },
  'lisans E P3 85 Kamu Yön. 1997': { okul: 4, bolum: 'Kamu Yönetimi', puanlar: [x('P3', '85')], dogum: '1997-01-01', cinsiyet: 'E', asker: 'yapti', ehliyet: 'B', boy: '175', ...ek },
  'lisans K P3 75 İşletme 1986 (40 yaş)': { okul: 4, bolum: 'İşletme', puanlar: [x('P3', '75')], dogum: '1986-06-06', cinsiyet: 'K', ehliyet: 'B', boy: '165', ...ek },
  'KULLANICI: lisans E Coğrafya P3 67 1997-11-01': { okul: 4, bolum: 'Coğrafya', puanlar: [x('P3', '67')], dogum: '1997-11-01', cinsiyet: 'E', asker: 'yapti', ehliyet: 'B', ...ek },
};
for (const [ad, p] of Object.entries(PROFILLER)) {
  const t0 = Date.now();
  const r = JSON.parse(C.hesapla(ilanlar, JSON.stringify(p), null));
  const say = { uygun: 0, bak: 0, uymuyor: 0 };
  r.ilanlar.forEach(x => x.pozisyonlar.forEach(z => say[z.grup] = (say[z.grup] || 0) + 1));
  console.log(`## ${ad} → uygun ${say.uygun}, kontrol ${say.bak}, uymuyor ${say.uymuyor} · açık ilan ${r.ilanlar.length} · profil %${r.profil.doluluk} · ${Date.now() - t0} ms`);
}
const a = JSON.parse(C.ayrinti(JSON.stringify(JSON.parse(ilanlar)[0]), 'Memur'));
console.log('ayrıntı: belge', a.belgeler.length, 'isNe', !!a.isNe);
