/* Çekirdek imza anahtarı (ECDSA P-256) — YALNIZ BİR KEZ çalıştırılır.
   Gizli anahtar: android\cekirdek_imza.pem (depoya GİRMEZ; yedeği imza yedek klasörüne kopyala).
   Açık anahtar: ekrana yazılır → kotlin\...\CekirdekGuncel.kt içine gömülür (Android: SPKI, iOS: ham 65 bayt).
   Kullanım: node cekirdek\imza_anahtar.js */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const GIZLI = path.join(__dirname, '..', 'android', 'cekirdek_imza.pem');
if (fs.existsSync(GIZLI)) { console.error('Anahtar zaten var, üzerine yazılmaz:', GIZLI); process.exit(1) }
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
fs.writeFileSync(GIZLI, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
const spki = publicKey.export({ type: 'spki', format: 'der' });
console.log('SPKI (Android):', spki.toString('base64'));
console.log('HAM (iOS, 65 bayt):', spki.subarray(spki.length - 65).toString('base64'));
