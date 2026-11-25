/* Motor dosyalarını + cekirdek.js'i tek dosyada birleştirir: cekirdek\memurol-cekirdek.js
   Bu dosya Kotlin uygulamasına (composeResources) kopyalanır; --yayinla ile sitede de (docs/cekirdek) imzalı yayımlanır.
   Kullanım: node cekirdek\paketle.js [hedef klasör...] [--yayinla]
   --yayinla: docs/cekirdek/{memurol-cekirdek.js, .sig, surum.json} — imza android\cekirdek_imza.pem ile (yalnız bu bilgisayarda).
   Uygulamalar sitedeki motoru yalnız imza tutarsa, API uyuyorsa ve sürüm içlerindekinden yeniyse kullanır. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const D = path.join(__dirname, '..');
const API = 1;   // cekirdek.js'in hesapla/ayrinti/sabitler/say imzası değişirse artır (eski uygulamalar yeni motoru almaz)
const DOSYALAR = ['motor.js', 'il.js', 'sure.js', 'taban.js', 'taban_veri.js', 'bolucu.js', 'bolumler.js', 'ozet.js', 'cekirdek/cekirdek.js'];
const arg = process.argv.slice(2), yayinla = arg.includes('--yayinla'), hedefKlasorler = arg.filter(a => !a.startsWith('--'));
const oku = f => fs.readFileSync(path.join(D, f), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
const govde = DOSYALAR.map(f => `/* ${f} */\n${oku(f)}\n`).join('\n');
// Sürüm = içeriğin özetinden bağımsız artan sayı: YYYYAAGGSSDD (aynı içerik tekrar paketlenirse önceki sürüm korunur)
const SURUM_DOSYA = path.join(__dirname, '.surum.json');
const ozet = crypto.createHash('sha256').update(govde).digest('hex');
let kayit = {}; try { kayit = JSON.parse(fs.readFileSync(SURUM_DOSYA, 'utf8')) } catch { }
let surum = kayit.ozet === ozet ? kayit.surum : +new Date().toISOString().replace(/\D/g, '').slice(0, 12);
fs.writeFileSync(SURUM_DOSYA, JSON.stringify({ surum, ozet }));
// module/require yokken her dosya kendini genel alana (this) yazar; taban_veri 'window' bekler
const cikti = `/* Memur Ol çekirdeği — sürüm ${surum} — üretildi, elle değiştirme (node cekirdek/paketle.js) */\nvar window = this;\nvar CEKIRDEK_SURUM = ${surum}, CEKIRDEK_API = ${API};\n` + govde;
const hedefler = [path.join(__dirname, 'memurol-cekirdek.js'), ...hedefKlasorler.map(h => path.join(h, 'memurol-cekirdek.js'))];
for (const h of hedefler) { fs.mkdirSync(path.dirname(h), { recursive: true }); fs.writeFileSync(h, cikti) }
console.log('yazıldı', hedefler.length, 'yere,', Math.round(Buffer.byteLength(cikti) / 1024) + ' KB, sürüm', surum);

if (yayinla) {
  const anahtar = path.join(D, 'android', 'cekirdek_imza.pem');
  if (!fs.existsSync(anahtar)) { console.error('İmza anahtarı yok: ' + anahtar); process.exit(1) }
  const Y = path.join(D, 'docs', 'cekirdek'); fs.mkdirSync(Y, { recursive: true });
  const veri = Buffer.from(cikti, 'utf8');
  const imza = crypto.sign('sha256', veri, fs.readFileSync(anahtar, 'utf8'));   // ECDSA P-256, DER
  fs.writeFileSync(path.join(Y, 'memurol-cekirdek.js'), veri);
  fs.writeFileSync(path.join(Y, 'memurol-cekirdek.sig'), imza.toString('base64'));
  fs.writeFileSync(path.join(Y, 'surum.json'), JSON.stringify({ surum, api: API, boyut: veri.length, sha256: crypto.createHash('sha256').update(veri).digest('hex') }));
  console.log('sitede yayımlanacak: docs/cekirdek (imzalı), sürüm', surum);
}
