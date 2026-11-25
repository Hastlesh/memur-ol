/* Tek profille çekirdek sonucu: uygun ve kontrol pozisyonlarını adlarıyla yazar.
   Kullanım: node cekirdek\profil_dene.js '<profil json>' [ilanlar.json yolu] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, 'memurol-cekirdek.js'), 'utf8'), ctx);
const yol = process.argv[3] || path.join(__dirname, '..', 'telefon', 'ilanlar.json');
const ilanlar = JSON.stringify(JSON.parse(fs.readFileSync(yol, 'utf8')).ilanlar);
const r = JSON.parse(ctx.MemurOlCekirdek.hesapla(ilanlar, process.argv[2], null));
for (const g of ['uygun', 'bak']) {
  const L = r.ilanlar.flatMap(x => x.pozisyonlar.filter(z => z.grup === g).map(z => `${x.kurumKisa} | ${z.ad} | ${z.neden}`));
  console.log(`## ${g}: ${L.length}`); L.forEach(s => console.log('   ' + s.slice(0, 200)));
}
