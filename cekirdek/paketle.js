/* Motor dosyalarını + cekirdek.js'i tek dosyada birleştirir: cekirdek\memurol-cekirdek.js
   Bu dosya Kotlin uygulamasına (Android assets, iOS kaynakları) kopyalanır.
   Kullanım: node cekirdek\paketle.js [hedef klasör...] */
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..');
const DOSYALAR = ['motor.js', 'il.js', 'sure.js', 'taban.js', 'taban_veri.js', 'bolucu.js', 'bolumler.js', 'ozet.js', 'cekirdek/cekirdek.js'];
const oku = f => fs.readFileSync(path.join(D, f), 'utf8').replace(/^﻿/, '');
// module/require yokken her dosya kendini genel alana (this) yazar; taban_veri 'window' bekler
const cikti = `/* Memur Ol çekirdeği — ${new Date().toISOString().slice(0, 10)} — üretildi, elle değiştirme (node cekirdek/paketle.js) */\nvar window = this;\n` +
  DOSYALAR.map(f => `/* ${f} */\n${oku(f)}\n`).join('\n');
const hedefler = [path.join(__dirname, 'memurol-cekirdek.js'), ...process.argv.slice(2).map(h => path.join(h, 'memurol-cekirdek.js'))];
for (const h of hedefler) { fs.mkdirSync(path.dirname(h), { recursive: true }); fs.writeFileSync(h, cikti) }
console.log('yazıldı', hedefler.length, 'yere,', Math.round(Buffer.byteLength(cikti) / 1024) + ' KB');
