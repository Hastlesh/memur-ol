/* Yayınlanacak ilan dosyasıyla (telefon\ilanlar.json) yanlış "uygun" taraması.
   Kullanım: node tarama\kontrol.js [ayrinti]   → her profil için uygun pozisyonlar ve sayılar */
const fs = require('fs'), path = require('path'), D = path.join(__dirname, '..', '..');
const B = require(D + '/bolucu.js'), S = require(D + '/sure.js'), M = require(D + '/motor.js'), O = require(D + '/ozet.js');
const v = JSON.parse(fs.readFileSync(D + '/telefon/ilanlar.json', 'utf8'));
const x = (t, p) => ({ tur: t, puan: p, yil: '2026' });
const ek = { sozlesmeli: 'hayir', fesih: 'hayir', ogrenci: 'degil', emekli: 'hayir', kadrolu: 'hayir', belgeSoruldu: true, belgeler: [], genel: true };
const P = {
  'lise E P94 72 B 1999': { okul: 2, bolum: '', puanlar: [x('P94', '72')], dogum: '1999-04-04', cinsiyet: 'E', asker: 'yapti', ehliyet: 'B', ...ek },
  'önlisans K P93 70 Büro Yön. 2000': { okul: 3, bolum: 'Büro Yönetimi ve Yönetici Asistanlığı', puanlar: [x('P93', '70')], dogum: '2000-02-02', cinsiyet: 'K', ehliyet: '', ...ek },
  'lisans E P3 85 Kamu Yön. 1997': { okul: 4, bolum: 'Kamu Yönetimi', puanlar: [x('P3', '85')], dogum: '1997-01-01', cinsiyet: 'E', asker: 'yapti', ehliyet: 'B', boy: '175', ...ek },
  'lisans K P3 75 İşletme 1986 (40 yaş)': { okul: 4, bolum: 'İşletme', puanlar: [x('P3', '75')], dogum: '1986-06-06', cinsiyet: 'K', ehliyet: 'B', boy: '165', ...ek },
  'KULLANICI: lisans E Coğrafya P3 67 1997-11-01': { okul: 4, bolum: 'Coğrafya', puanlar: [x('P3', '67')], dogum: '1997-11-01', cinsiyet: 'E', asker: 'yapti', ehliyet: 'B', ...ek },
  'KULLANICI + boy 175 kilo 75': { okul: 4, bolum: 'Coğrafya', puanlar: [x('P3', '67')], dogum: '1997-11-01', cinsiyet: 'E', asker: 'yapti', ehliyet: 'B', boy: '175', kilo: '75', ...ek },
  'KULLANICI + boy 175 kilo 95 (fark 20)': { okul: 4, bolum: 'Coğrafya', puanlar: [x('P3', '67')], dogum: '1997-11-01', cinsiyet: 'E', asker: 'yapti', ehliyet: 'B', boy: '175', kilo: '95', ...ek }
};
for (const [ad, p] of Object.entries(P)) {
  const U = []; let b = 0;
  for (const i of v.ilanlar) {
    const s = S.durum(S.bul(i.metin)); if (s.kod === 'gecti') continue;
    const t = s.son ? s.son.zaman : new Date();
    if (i.eksik) { b++; continue }
    if (i.B && i.B.kadrolar) {
      for (const k of B.degerlendir(i.B, p, t).kadrolar) {
        if (O.akademik(k.ad)) continue;
        if (k.grup === 'uygun') U.push(`${i.ad.split(':')[0]} | ${k.ad} | ${k.sartlar.map(z => z.not).join(' ; ')}`);
        else if (['bak', 'belge'].includes(k.grup)) b++;
      }
    } else { const r = M.incele(i.metin, p, t); if (r.sonuc === 'uygun') U.push(`${i.ad} (tablosuz) | ${r.satirlar.map(z => z.not).join(' ; ')}`); else if (r.sonuc === 'bak') b++ }
  }
  console.log(`## ${ad} → uygun ${U.length}, kontrol ${b}`);
  for (const u of U) console.log('   ' + (process.argv[2] ? u : u.slice(0, 170)));
}
