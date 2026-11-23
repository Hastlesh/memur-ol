/* Android uygulamasının içindeki sayfa (assets/index.html). android\yap.ps1 çağırır.
   Kullanım: node apk_sayfa.js <çıktı dosyası> */
const fs = require('fs'), path = require('path');
const ILAN = 'https://hastlesh.github.io/sartim-tamam/ilanlar.json';
const sayfa = fs.readFileSync(path.join(__dirname, 'sartim-tamam.html'), 'utf8');
let html = '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  + '<meta http-equiv="Content-Security-Policy" content="{{CSP}}"><meta name="referrer" content="strict-origin-when-cross-origin">'
  + `<style>html,body{margin:0}</style><script>window.ILAN_ADRESI=${JSON.stringify(ILAN)}</script></head><body>` + sayfa + '</body></html>';
html = require('./csp').cspEkle(html, { baglan: "'self' https://hastlesh.github.io" });
fs.writeFileSync(process.argv[2], html);
console.log('APK sayfası:', Math.round(Buffer.byteLength(html) / 1024) + ' KB');
