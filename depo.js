/* Şartım Tamam - saklama.
   Bilgisayardaki dosyada: tarayıcı hafızası.
   Telefon sayfasında: Claude hesabının sadece kullanıcıya açık özel alanı + tarayıcı hafızası. */
(function (kok) {
  'use strict';
  const oku = (ad, v) => { try { return JSON.parse(localStorage.getItem('st_' + ad)) || v } catch { return v } };
  const bellek = new Map();
  const yerelYaz = (ad, v) => { try { localStorage.setItem('st_' + ad, JSON.stringify(v)); return true } catch { return false } };
  const bayt = s => new TextEncoder().encode(JSON.stringify({ json: s })).length;
  const SINIR = 250000;   // belge başına 256 KB
  const TANE = { kisiler: 'profil', taban: 'taban' };

  let db = null, kok_ = '', bildir = () => {}, bekleyen = new Map(), gonderilen = new Map(), zincir = Promise.resolve(), zaman = null;

  const ilanlar = () => db.collection(`${kok_}/ilanlar/oge`);

  async function gonder() {
    clearTimeout(zaman);
    if (!db || !bekleyen.size) return zincir;
    const is = [...bekleyen];
    bekleyen = new Map();
    zincir = zincir.then(async () => {
      for (const [ad, v] of is) {
        try {
          if (ad === 'kayit') {
            const simdi = new Map();
            for (const k of v) {
              let json = JSON.stringify(k);
              if (bayt(json) > SINIR) {
                json = JSON.stringify({ ...k, belge: null });
                bildir('Bu ilan büyük olduğu için tablosuz saklandı. Açınca PDF dosyasını yeniden seç.');
              }
              if (bayt(json) > SINIR) { bildir('Bu ilan hesabına sığmadı, sadece bu cihazda duruyor.'); continue }
              simdi.set(k.id, json);
              if (gonderilen.get(k.id) !== json) { await ilanlar().doc(k.id).set({ json }); gonderilen.set(k.id, json) }
            }
            const duran = new Set(v.map(k => k.id));
            for (const id of [...gonderilen.keys()]) if (!duran.has(id)) { await ilanlar().doc(id).delete(); gonderilen.delete(id) }
          } else if (TANE[ad]) {
            const json = JSON.stringify(v);
            if (bayt(json) > SINIR) { bildir('Taban dosyaları hesabına sığmadı, sadece bu cihazda duruyor.'); continue }
            await db.doc(`${kok_}/${TANE[ad]}`).set({ json });
          }
        } catch {
          if (!bekleyen.has(ad)) bekleyen.set(ad, v);
          bildir('Hesabına kaydedemedim, bu cihazda duruyor. İnternet gelince bir değişiklikte yeniden denerim.');
        }
      }
    });
    return zincir;
  }

  function yaz(ad, v) {
    bellek.set(ad, v);
    const oldu = yerelYaz(ad, v);
    if (db) {
      bekleyen.set(ad, v);
      clearTimeout(zaman);
      zaman = setTimeout(gonder, 700);
    }
    return oldu || !!db;
  }

  async function cek(uygula) {
    if (!db || bekleyen.size) return;
    const [profil, taban, liste] = await Promise.all([
      db.doc(`${kok_}/profil`).get(), db.doc(`${kok_}/taban`).get(), ilanlar().get()
    ]);
    if (bekleyen.size) return;   // bu arada kullanıcı değişiklik yaptı
    const gelen = {};
    const coz = d => { try { return JSON.parse(d.data().json) } catch { return null } };
    if (profil.exists) { const v = coz(profil); if (Array.isArray(v) && v.length) gelen.kisiler = v }
    if (taban.exists) { const v = coz(taban); if (Array.isArray(v)) gelen.taban = v }
    const kayit = [];
    gonderilen = new Map();
    for (const d of liste.docs) {
      const v = coz(d);
      if (!v || typeof v.metin !== 'string') continue;
      v.id = d.id; kayit.push(v); gonderilen.set(d.id, d.data().json);
    }
    gelen.kayit = kayit.sort((a, b) => (b.eklendi || 0) - (a.eklendi || 0));
    for (const ad in gelen) { bellek.set(ad, gelen[ad]); yerelYaz(ad, gelen[ad]) }
    uygula(gelen);
  }

  // true: hesaba bağlandı. false: sadece bu cihaz.
  async function bagla(uygula, mesaj) {
    bildir = mesaj || bildir;
    if (!kok.claude || !kok.claude.use) return false;
    const dene = async () => {
      const [d, u] = await Promise.all([kok.claude.use('db'), kok.claude.use('user')]);
      const id = d && u ? await u.id() : null;
      return id ? { d, id } : null;
    };
    const sureli = (is, ms) => Promise.race([is, new Promise((_, red) => setTimeout(() => red(new Error('süre')), ms))]);
    try {
      const b = await sureli(dene(), 11000);
      if (!b) return false;
      db = b.d; kok_ = 'data/users/' + b.id;
      await sureli(cek(uygula), 11000);
    } catch { db = null; return false }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') gonder();
      else cek(uygula).catch(() => {});
    });
    return true;
  }

  // Herkesin okuduğu ilan listesi: sayfayla birlikte yayınlanan ilanlar.json (giriş gerekmez).
  // Claude yeni ilanları yükleyip sayfayı yeniden yayınlar; açık uygulama 10 dakikada bir ve
  // telefona geri dönülünce yeniden bakar. Dosya yoksa eski yol: Claude veritabanı.
  // gelince(ilanlar, guncel, kaynak): kaynak = 'canli' (internetten) | 'gomulu' (Android'in içindeki kopya) | 'onbellek' (internet yok, son görülen)
  // Gelen ilan listesini denetler: biçimi bozuk ya da beklenmeyen kayıtlar atılır. Veri kaynağı (GitHub)
  // bozulsa ya da ele geçirilse bile uygulama çökmez, tuhaf veri ekrana gelmez (OWASP A08: veri bütünlüğü).
  const KIMLIK = /^[\w-]{1,160}$/;
  function denetle(v) {
    const L = Array.isArray(v) ? v : v && v.ilanlar;
    if (!Array.isArray(L) || L.length > 3000) throw new Error('biçim');
    const temiz = [], gorulen = new Set();
    const yazi = (s, n) => s == null || (typeof s === 'string' && s.length <= n);
    for (const x of L) {
      if (!x || typeof x !== 'object' || Array.isArray(x)) continue;
      if (typeof x.id !== 'string' || !KIMLIK.test(x.id) || gorulen.has(x.id)) continue;
      if (typeof x.metin !== 'string' || x.metin.length > 600000) continue;
      if (!yazi(x.ad, 2000) || !yazi(x.kaynak, 2000)) continue;
      if (x.B != null && (typeof x.B !== 'object' || Array.isArray(x.B))) continue;
      if (x.uyari != null && !Array.isArray(x.uyari)) continue;
      if (x.eklendi != null && !Number.isFinite(x.eklendi)) continue;
      gorulen.add(x.id); temiz.push(x);
    }
    const g = v && !Array.isArray(v) ? v.guncel : null;
    return { L: temiz, guncel: typeof g === 'string' || Number.isFinite(g) ? g : null };
  }

  let yenileFn = null;
  async function ortakIlanlar(gelince, olmadi) {
    let son = '';
    const getir = async () => {
      let kaynak = 'canli';
      // Android uygulaması: önce internetteki güncel liste (window.ILAN_ADRESI), olmazsa uygulamanın içindeki kopya
      let r = null;
      if (kok.ILAN_ADRESI) { try { r = await fetch(kok.ILAN_ADRESI + '?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) r = null } catch { r = null } }
      if (!r) { if (kok.ILAN_ADRESI) kaynak = 'gomulu'; r = await fetch('ilanlar.json?t=' + Date.now(), { cache: 'no-store' }) }
      if (!r.ok) throw new Error(r.status);
      const metin = await r.text();
      if (metin.length > 30e6) throw new Error('büyük');
      if (metin === son) return kaynak;
      const { L, guncel } = denetle(JSON.parse(metin));
      if (!L.length) throw new Error('boş');   // boş/bozuk liste eskisinin yerine geçmez
      son = metin;
      try { localStorage.setItem('st_ortak', metin) } catch {}
      gelince(L, guncel, kaynak);
      return kaynak;
    };
    yenileFn = getir;
    try {
      await getir();
      setInterval(() => getir().catch(() => {}), 600000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') getir().catch(() => {}) });
      return;
    } catch {
      // İnternet yoksa son görülen liste
      try {
        const { L, guncel } = denetle(JSON.parse(localStorage.getItem('st_ortak')));
        if (L.length) { gelince(L, guncel, 'onbellek'); setInterval(() => getir().catch(() => {}), 60000); return }
      } catch {}
    }
    if (!kok.claude || !kok.claude.use) return olmadi();
    let saat = setTimeout(olmadi, 11000);
    const d = await Promise.race([kok.claude.use('db'), new Promise(r => setTimeout(() => r(null), 11000))]);
    if (!d) { clearTimeout(saat); return olmadi() }
    d.collection('ilanlar').onSnapshot(s => {
      if (s.metadata.fromCache && !s.size) return;
      clearTimeout(saat);
      const L = [];
      for (const x of s.docs) { try { const v = JSON.parse(x.data().json); v.id = x.id; L.push(v) } catch {} }
      gelince(L);
    }, () => { clearTimeout(saat); olmadi() });
  }

  // Elle yenile: internetten yeniden indirir; sonuç kaynağı döner (hata = internet yok)
  const ilanYenile = () => yenileFn ? yenileFn() : Promise.reject(new Error('hazır değil'));
  kok.Depo = { ortakIlanlar, ilanYenile, oku: (ad, v) => bellek.has(ad) ? bellek.get(ad) : oku(ad, v), yaz, bagla };
})(this);
