/* İlan yükleyici: PDF'i kadrolara ayırıp ortak listeye konacak kaydı hazırlar.
   Kullanım: node yukle.js ilan.pdf [ek1.pdf ...] [--kaynak https://...]
   Çıktı: kayitlar\<id>.json  ({json: "..."} biçiminde, doğrudan ortak listeye yazılır) */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { pathToFileURL } = require('url');
const K = path.join(__dirname, '..');
const Motor = require(path.join(K, 'motor.js'));
const Il = require(path.join(K, 'il.js'));
const Sure = require(path.join(K, 'sure.js'));
const Bolucu = require(path.join(K, 'bolucu.js'));

async function oku(pdfjs, dosya) {
  return Bolucu.pdfOku(pdfjs, new Uint8Array(fs.readFileSync(dosya)));
}

(async () => {
  const arg = process.argv.slice(2);
  const ki = arg.indexOf('--kaynak');
  const kaynak = ki >= 0 ? arg.splice(ki, 2)[1] : '';
  // İlanda son gün bulunamazsa resmî dizindeki tarih, kaynağı yazılarak eklenir.
  const si = arg.indexOf('--son');
  const sonYedek = si >= 0 ? arg.splice(si, 2)[1] : '';
  if (!arg.length) { console.log('Kullanım: node yukle.js ilan.pdf [ek.pdf ...] [--kaynak adres]'); process.exit(1) }

  const pdfjs = await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;

  // --metin dosya.txt: PDF resimse yazı tanımayla (OCR) çıkarılan metin kullanılır. Tablo yok; "eksik" sayılır.
  const mi = arg.indexOf('--metin');
  const ocr = mi >= 0 ? arg.splice(mi, 2)[1] : '';
  const ana = await oku(pdfjs, arg[0]);
  if (ocr) {
    ana.metin = fs.readFileSync(ocr, 'utf8').replace(/\f/g, '\n\n');
    ana.tablolar = [];
    ana.bosSayfa = [];
  }
  const ekler = [];
  for (const f of arg.slice(1)) ekler.push(await oku(pdfjs, f));
  // Düzeltme ilanı ana metne eklenir; il tablosu olan ekler ayrı tutulur.
  let metin = ana.metin.trim();
  for (let i = ekler.length - 1; i >= 0; i--) {
    if (!Il.oku(ekler[i].tablolar).length && /DÜZELTME|düzeltme/.test(ekler[i].metin.slice(0, 600))) {
      metin += '\n\nDÜZELTME İLANI (Resmî Gazete):\n' + ekler[i].metin.trim();
      ekler.splice(i, 1);
    }
  }
  if (sonYedek && !Sure.durum(Sure.bul(metin)).son) metin += `\n\nSon başvuru tarihi: ${sonYedek} (ilanda bulunamadı, SBB kamu ilanları listesinden alındı)`;
  if (metin.length < 100) { console.log('HATA: PDF\'ten yazı çıkmadı (taranmış resim olabilir).'); process.exit(2) }

  const B = Bolucu.bol(ana);
  const uyari = [];
  if (ocr) uyari.push('İlan resim olarak basılmış; yazı tanımayla okundu, hata olabilir. Şartları ilanın aslından kontrol et.');
  else if (ana.bosSayfa.length) uyari.push(`${ana.bosSayfa.join(', ')}. sayfa resim, okunamadı.`);
  if (B) {
    const listeler = [ana.tablolar, ...ekler.map(e => e.tablolar)].flatMap(t => Il.oku(t));
    const d = Il.bagla(B.kadrolar, listeler, metin);
    B.ilHarita = d.harita; B.ilUyari = d.uyari; B.ilTam = d.tam; B.ilBagli = d.bagli;
    for (const e of ekler) if (!Il.oku(e.tablolar).length) uyari.push('Bir ek dosyada il tablosu bulunamadı.');
  } else if (ekler.length) {
    // Kadro tablosu yoksa (ör. antrenör) dağılım ham haliyle saklanır.
    uyari.push('Kadro tablosu yok; il dağılımı kadroya bağlanamadı.');
  }

  const S = Sure.durum(Sure.bul(metin));
  const id = Bolucu.ilanAdi(metin).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) + '-' + crypto.createHash('sha1').update(metin).digest('hex').slice(0, 8);
  // Tablosu resim olan ilanın şartları eksik okunur: "uygun" denmez.
  const eksik = ana.bosSayfa.length > 0 || !!ocr;
  const kayit = { id, eklendi: Date.now(), ad: Bolucu.ilanAdi(metin), kaynak, metin, B, uyari, eksik };
  const json = JSON.stringify(kayit);
  const boyut = Buffer.byteLength(JSON.stringify({ json }));
  if (boyut > 250000) { console.log(`HATA: kayıt çok büyük (${Math.round(boyut / 1024)} KB).`); process.exit(3) }

  const cik = path.join(__dirname, 'kayitlar');
  fs.mkdirSync(cik, { recursive: true });
  fs.writeFileSync(path.join(cik, id + '.json'), JSON.stringify({ json }));

  // Yüklemeden önce kontrol için özet
  console.log(JSON.stringify({
    id, ad: kayit.ad, eksik, boyutKB: Math.round(boyut / 1024),
    son: S.son ? S.son.zaman.toISOString() : null, sure: S.baslik,
    kadro: B ? B.kadrolar.length : 0, okunan: B && B.okunan, beklenen: B && B.beklenen, saglama: B && B.saglama,
    genel: B ? !!B.genel : null, ilBagli: B && B.ilBagli, ilTam: B && B.ilTam,
    uyari: [...uyari, ...(B ? [...B.uyari, ...B.ilUyari] : [])],
    kadrolar: B ? B.kadrolar.map(k => `${k.ad} (${k.adet})`) : []
  }, null, 1));
})().catch(e => { console.log('HATA:', e.message); process.exit(4) });
