/* İçerik Güvenlik Politikası (CSP): sayfada yalnızca bizim yazdığımız betikler çalışır.
   Her <script> bloğunun SHA-256 özeti politikaya yazılır; 'unsafe-inline' yoktur. İlan verisine biri
   kod gizlese bile (ör. <img onerror=...>) tarayıcı çalıştırmaz (OWASP A03 / MASVS-CODE).
   Kullanım: const { cspEkle } = require('./csp'); html = cspEkle(html, { baglan: "'self' https://..." }) */
const crypto = require('crypto');

function cspEkle(html, { baglan = "'self'", ek = '' } = {}) {
  if (!html.includes('{{CSP}}')) throw new Error('sayfada {{CSP}} yeri yok');
  const ozetler = [];
  for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    ozetler.push(`'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  }
  if (/<script\s+src=/i.test(html)) throw new Error('dış betik dosyası beklenmiyor');
  // Satır içi olay işleyicileri (onclick="...") politika gereği çalışmaz; varsa yapım dursun
  if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/g, ''))) throw new Error('satır içi olay işleyicisi var');
  const politika = [
    "default-src 'none'",
    `script-src ${[...new Set(ozetler)].join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    `connect-src ${baglan}`,
    ek,
    "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-src 'none'"
  ].filter(Boolean).join('; ');
  return html.replace('{{CSP}}', politika);
}
module.exports = { cspEkle };
