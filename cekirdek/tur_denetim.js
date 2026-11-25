/* Çekirdek çıktısının türleri Kotlin modeliyle (MemurOlKMP Model.kt) uyumlu mu?
   Çok sayıda profil × tüm ilanlar: her alan beklenen türde olmalı. Uyumsuzluk = telefonda "Bir sorun var" ekranı.
   Kullanım: node cekirdek\tur_denetim.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, 'memurol-cekirdek.js'), 'utf8'), ctx);
const C = ctx.MemurOlCekirdek;
const ilanlar = JSON.stringify(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'telefon', 'ilanlar.json'), 'utf8')).ilanlar);
const M = 'metin', MN = 'metin?', S = 'sayı', SN = 'sayı?', B = 'mantık', LM = 'metin[]';
const SEMA = {
  ilan: { id: M, eklendi: SN, kurum: M, kurumKisa: M, konu: M, konuKisa: M, kaynak: MN, duyuru: B, eksik: B },
  sure: { kod: M, kisa: M, baslik: M, not: LM, son: MN, bas: MN },
  ozet: { tur: MN, turAd: MN, kisi: SN, ilanNe: M, yer: M, link: MN, adimlar: LM, etiketler: LM, ilkDefa: B },
  poz: { anahtar: M, i: S, ad: M, grup: M, neden: M, adet: SN, ildeki: SN, tablosuz: B, kpssPuan: SN },
  sart: { tur: MN, sinif: MN, durum: M, not: M, eksik: MN, metin: MN },
};
const uyar = (t, v) => ({ [M]: typeof v === 'string', [MN]: v == null || typeof v === 'string', [S]: typeof v === 'number', [SN]: v == null || typeof v === 'number',
  [B]: typeof v === 'boolean', [LM]: Array.isArray(v) && v.every(x => typeof x === 'string') })[t];
const hatalar = new Map();
const bak = (ad, o, sema) => { for (const [k, t] of Object.entries(sema)) if (!uyar(t, o[k])) { const a = `${ad}.${k} beklenen ${t}, gelen ${JSON.stringify(o[k]).slice(0, 60)}`; hatalar.set(a, (hatalar.get(a) || 0) + 1) } };
const x = (t, p, y = '2026') => ({ tur: t, puan: p, yil: y });
const P = [];
for (const okul of [2, 3, 4, 5]) for (const c of ['E', 'K']) for (const puan of ['55', '67', '80', '95'])
  P.push({ okul, bolum: okul >= 3 ? ['Coğrafya', 'İşletme', 'Bilgisayar Programcılığı', 'Hukuk'][puan.length % 4 + okul % 3] || 'İşletme' : '', puanlar: [x({ 2: 'P94', 3: 'P93' }[okul] || 'P3', puan)],
    dogum: c === 'E' ? '1997-11-01' : '2001-03-03', cinsiyet: c, asker: c === 'E' ? 'yapti' : '', ehliyet: 'B', boy: '176', kilo: '70', genel: true, belgeSoruldu: true, belgeler: [], iller: puan === '80' ? 'Ankara' : '' });
P.push({ genel: true }, { okul: 4, puanYok: true, genel: true });
let poz = 0;
for (const p of P) {
  const r = JSON.parse(C.hesapla(ilanlar, JSON.stringify(p), null));
  for (const i of r.ilanlar) {
    bak('ilan', i, SEMA.ilan); bak('sure', i.sure, SEMA.sure); bak('ozet', i.ozet, SEMA.ozet);
    for (const z of i.pozisyonlar) { poz++; bak('poz', z, SEMA.poz); z.sartlar.forEach(s => bak('sart', s, SEMA.sart)) }
  }
}
console.log(`${P.length} profil, ${poz} pozisyon denetlendi.`);
if (hatalar.size) { console.log('UYUMSUZ ALANLAR:'); for (const [a, n] of hatalar) console.log(`  ${n}× ${a}`); process.exit(1) }
console.log('Tüm alanlar Kotlin modeline uygun.');
