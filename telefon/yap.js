/* Telefon sayfasını bilgisayardaki index.html'den üretir.
   Kullanım: node yap.js   →   sartim-tamam.html
   index.html veya *.js değişince yeniden çalıştırılıp aynı adrese yayınlanır. */
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..');
const oku = f => fs.readFileSync(path.join(D, f), 'utf8').replace(/\r\n/g, '\n').replace(/^﻿/, '');
// Kaynak: sade uygulama (uygulama.html). Eski ayrıntılı araç için: node yap.js index.html
const h = oku(process.argv[2] || 'uygulama.html');
const al = (re, ad) => { const m = h.match(re); if (!m) throw new Error(ad + ' bulunamadı'); return m[1] };

const stil = al(/<style>([\s\S]*?)<\/style>/, 'stil');
const govde = al(/<body>([\s\S]*?)<script src="motor\.js">/, 'gövde');
const dosyalar = [...h.matchAll(/<script src="([\w.]+\.js)"><\/script>/g)].map(m => m[1]);
const kod = al(/<script>\n('use strict';[\s\S]*?)<\/script>\s*<\/body>/, 'kod');
const guvenli = s => s.replace(/<\/script/gi, '<\\/script');

const cikti = `<title>Memur Ol</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${stil}</style>
${govde}
<script>window.TELEFON = true;</script>
${dosyalar.map(f => `<script>/* ${f} */\n${guvenli(oku(f))}\n</script>`).join('\n')}
<script>
${guvenli(kod)}</script>
`;
fs.writeFileSync(path.join(__dirname, 'sartim-tamam.html'), cikti);
console.log('yazıldı', dosyalar.join(', '), Math.round(Buffer.byteLength(cikti) / 1024) + ' KB');
