/* Memur Ol çekirdeği — yerel (Kotlin) uygulamalar için tek giriş noktası.
   Motor dosyaları (motor, il, sure, taban, taban_veri, bolucu, bolumler, ozet) bundan ÖNCE aynı genel alanda çalıştırılır.
   Hesap mantığı uygulama.html'deki pozisyonlar()/eksikler()/engeller()/hedefPuan() ile birebir aynıdır;
   orada bir kural değişirse burada da değiştir (kontrol: node cekirdek\dene.js).
   Giriş/çıkış JSON metnidir: Android JavaScriptSandbox ve iOS JavaScriptCore yalnız metin taşır. */
(function (kok) {
  'use strict';
  const Motor = kok.Motor, Il = kok.Il, Sure = kok.Sure, Ozet = kok.Ozet, Bolucu = kok.Bolucu;
  const kucuk = Motor.kucuk;

  const buyukHarf = s => s.toLocaleLowerCase('tr-TR').replace(/(^|[\s(/-])(\S)/g, (m, a, b) => a + b.toLocaleUpperCase('tr-TR')).replace(/\b(Ve|İle|Veya)\b/g, w => w.toLocaleLowerCase('tr-TR'));
  const kurumAd = x => String(x.ad).split(':')[0].trim();
  const konu = x => { const k = String(x.ad).split(':').slice(1).join(':').trim(); return k ? buyukHarf(k) : kurumAd(x) };
  function kurumKisa(x) {
    let s = kurumAd(x);
    if (s === s.toLocaleUpperCase('tr-TR')) s = buyukHarf(s);
    s = s.replace(/^(\S+) [İi]li (.+?) Belediye Başkanlığı$/, '$2 Belediyesi · $1').replace(/Belediye Başkanlığı/, 'Belediyesi')
      .replace(/ Rektörlüğü$/, '').replace(/^Cumhurbaşkanlığı (?=\S)/, '');
    if (/Bakanlığı \S/.test(s)) s = s.replace(/^.*?Bakanlığı (?=\S)/, '');
    return s.replace(/ (Başkanlığı|Genel Sekreterliği)$/, '');
  }
  function konuKisa(x) {
    let s = konu(x).replace(/\s*\([^)]*\)\s*$/, '').replace(/^\d{4} Yılı /i, '').replace(/İlk Defa Atanmak Üzere /i, '').replace(/\bTmsy\b/g, 'TMSY')
      .replace(/ ?(Giriş )?(Sınav(ı)?|Alım(ı)?|Temin(i)?) (İlanı|Duyurusu)$/i, '').replace(/ ?(İlanı|Duyurusu)$/i, '').trim();
    if (!s) s = 'Personel';
    if (/^(Personel|Memur|Sözleşmeli Personel|Sözleşmeli Bilişim Personeli|Sürekli İşçi|Uzman Personel)$/i.test(s)) s += ' alımı';
    return s;
  }

  function pozisyonlar(x, p, S, O) {
    const t = S.son ? S.son.zaman : new Date(), L = [];
    const ilkDefaEngel = O.ilkDefa && p.kadrolu === 'evet';
    if (x.duyuru) {
      L.push({ i: -1, ad: konu(x), grup: 'bak', sartlar: [], neden: "Şartlar Kariyer Kapısı'nda", adet: null });
    } else if (x.eksik) {
      L.push({ i: -1, ad: konu(x), grup: 'bak', sartlar: [], neden: 'Şartlar ilanın aslında', adet: O.kisi });
    } else if (x.B && x.B.kadrolar && x.B.kadrolar.length) {
      const r = Bolucu.degerlendir(x.B, p, t), tercih = Il.tercihler(p.iller || '').iller;
      r.kadrolar.forEach((k, i) => {
        if (Ozet.akademik(k.ad)) return;
        let g = k.grup, neden = k.neden;
        if (g === 'belge') g = 'bak';
        if (g === 'bolum') { g = 'uymuyor'; neden = 'Bölümün bu kadroda geçmiyor.' }
        const il = x.B.ilHarita && x.B.ilHarita[i];
        let ildeki = null;
        if (tercih.length && il && g !== 'uymuyor') { ildeki = tercih.reduce((n, a) => n + (il[a] || 0), 0); if (!ildeki) { g = 'uymuyor'; neden = 'Seçtiğin illerde bu kadro yok.' } }
        if (ilkDefaEngel) { g = 'uymuyor'; neden = 'İlk defa atanacaklar için; kadrolu memurlar başvuramaz.' }
        L.push({ i, ad: k.ad, grup: g, sartlar: k.sartlar, neden, adet: k.adet, ildeki, kpssPuan: k.kpssPuan, ortak: r.ortakOku });
      });
    } else {
      const r = Motor.incele(x.metin, p, t);
      let g = r.sonuc === 'uygun' ? 'uygun' : r.sonuc === 'bak' ? 'bak' : 'uymuyor';
      const yok = r.satirlar.filter(s => s.durum === 'yok').map(s => s.not);
      const ilkBak = r.satirlar.find(s => s.durum === 'bak' && !/otomatik anlayamadım/.test(s.not));
      let neden = g === 'uymuyor' ? yok[0] : g === 'bak' ? (ilkBak ? ilkBak.not : 'Kontrol etmen gereken şart var') : '';
      const b = Motor.bolumAd(p.bolum || '');
      if (g === 'bak' && r.satirlar.some(s => s.tur === 'bolum' && s.durum === 'bak') && b.length > 2 && !kucuk(x.metin).includes(b)) { g = 'uymuyor'; neden = 'Bölümün ilanda geçmiyor.' }
      if (ilkDefaEngel) { g = 'uymuyor'; neden = 'İlk defa atanacaklar için; kadrolu memurlar başvuramaz.' }
      L.push({ i: -1, ad: konu(x), grup: g, sartlar: r.satirlar.filter(s => s.durum !== 'bilgi'), neden, adet: O.kisi, tablosuz: true });
    }
    return L;
  }

  // ---------- Profil tamlığı ----------
  const ALANLAR = {
    okul: ['Okul', 1], bolum: ['Bölüm', 1], puan: ['KPSS', 2], puanYil: ['Sınav yılı', 2], dogum: ['Doğum tarihi', 3], cinsiyet: ['Cinsiyet', 3],
    asker: ['Askerlik', 3], ikamet: ['Yaşadığın il', 3], ehliyet: ['Ehliyet', 4], belge: ['Belgeler', 4], boy: ['Boy', 5], kilo: ['Kilo', 5], deneyim: ['Deneyim', 5],
    ogrenci: ['Öğrencilik', 5], emekli: ['Emeklilik', 5], kadrolu: ['Kadrolu memurluk', 5], sozlesmeli: ['4/B durumu', 5], fesih: ['Fesih durumu', 5]
  };
  function alanListe(p) {
    const L = ['okul', 'puan', 'dogum', 'cinsiyet', 'ikamet', 'ehliyet', 'belge', 'boy', 'kilo', 'deneyim', 'ogrenci', 'emekli', 'kadrolu', 'sozlesmeli', 'fesih'];
    if (p.okul >= 3) L.splice(1, 0, 'bolum');
    if (p.cinsiyet === 'E') L.push('asker');
    return L;
  }
  const doluMu = (p, e) => ({ puan: Motor.puanListe(p).length > 0 || p.puanYok, ehliyet: p.ehliyet != null, belge: p.belgeSoruldu !== false, boy: !!p.boy, deneyim: p.deneyim !== '' && p.deneyim != null })[e] ?? !!p[e];
  const bosAlanlar = p => alanListe(p).filter(e => !doluMu(p, e));
  const doluluk = p => { const L = alanListe(p); return Math.round(100 * (L.length - bosAlanlar(p).length) / L.length) };
  function eksikler(P) {
    const say = {};
    for (const z of P) {
      if (z.grup !== 'bak') continue;
      for (const e of new Set(z.sartlar.filter(s => s.durum === 'bak' && s.eksik).map(s => s.eksik))) say[e] = (say[e] || 0) + 1;
    }
    return Object.entries(say).filter(([e]) => ALANLAR[e]).sort((a, b) => b[1] - a[1]);
  }
  const ENGEL = { okul: 'Okul düzeyi', ustYok: 'Üst öğrenim', bolum: 'Bölüm', kpss: 'KPSS puanı', puanTur: 'Okul düzeyi', kpssYil: 'KPSS yılı', yasUst: 'Yaş sınırı', yasAlt: 'Yaş sınırı', dogum: 'Yaş sınırı', ehliyet: 'Ehliyet', askerlik: 'Askerlik',
    boy: 'Boy / kilo', cinsiyet: 'Cinsiyet kadrosu', deneyim: 'Deneyim', belge: 'Belge / sertifika', ikamet: 'İkamet', ogrenci: 'Öğrencilik', emekli: 'Emeklilik', sozlesmeli: '4/B', fesih: '4/B fesih', tercih: 'Tercih', il: 'Seçtiğin iller', kadrolu: 'Kadrolu memurluk' };
  function engeller(P) {
    const say = {};
    for (const z of P) {
      if (z.grup !== 'uymuyor') continue;
      const s = z.sartlar.find(y => y.durum === 'yok');
      const t = s ? s.tur : /bölüm/i.test(z.neden || '') ? 'bolum' : /iller/i.test(z.neden || '') ? 'il' : /kadrolu/i.test(z.neden || '') ? 'kadrolu' : null;
      const ad = ENGEL[t]; if (ad) say[ad] = (say[ad] || 0) + 1;
    }
    return Object.entries(say).sort((a, b) => b[1] - a[1]);
  }
  function hedefPuan(P) {
    const L = [];
    for (const z of P) {
      if (z.grup !== 'uymuyor' || /bölüm|iller|kadrolu/i.test(z.neden || '')) continue;
      const yok = z.sartlar.filter(s => s.durum === 'yok');
      if (yok.length !== 1 || yok[0].tur !== 'kpss') continue;
      if (z.sartlar.some(s => (s.tur === 'bolum' || s.sinif === 'bolum') && s.durum !== 'tamam')) continue;
      if (z.tablosuz && z.sartlar.some(s => s.tur === 'bolum') && !z.sartlar.some(s => s.tur === 'bolum' && s.durum === 'tamam')) continue;
      const m = String(yok[0].not).match(/En az (\d{2,3}(?:[.,]\d+)?)/i);
      if (m) L.push({ anahtar: z.anahtar, puan: +m[1].replace(',', '.') });
    }
    return L.sort((a, b) => a.puan - b.puan);
  }

  const iso = d => d instanceof Date && !isNaN(d) ? d.toISOString() : null;
  // Kotlin tarafı tür bekler: sayı alanları sayı ya da null, metinler metin (motor bazen nesne/metin döndürür)
  const sayi = v => { const n = typeof v === 'object' && v ? (v.puan ?? v.deger) : v; const s = +String(n ?? '').replace(',', '.'); return n == null || n === '' || !isFinite(s) ? null : s };
  const tam = v => { const s = sayi(v); return s == null ? null : Math.round(s) };
  const yazi = v => v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.join(' ') : String(v);
  const sart = s => ({ tur: s.tur ? yazi(s.tur) : null, sinif: s.sinif ? yazi(s.sinif) : null, durum: yazi(s.durum) || 'bak', not: yazi(s.not), eksik: s.eksik ? yazi(s.eksik) : null, metin: (s.metin || s.cumle) ? yazi(s.metin || s.cumle) : null });

  // ilanlar: ilanlar.json'daki 'ilanlar' dizisi; profil: sihirbazın kaydettiği nesne; bugun: ISO (boşsa şimdi)
  function hesapla(ilanlarMetin, profilMetin, bugunMetin) {
    const ilanlar = JSON.parse(ilanlarMetin), p = JSON.parse(profilMetin || '{}') || {};
    const simdi = bugunMetin ? new Date(bugunMetin) : new Date();
    const cikti = [], tum = [];
    for (const x of ilanlar) {
      let S, O;
      try { S = Sure.durum(Sure.bul(x.metin), simdi); O = Ozet.ozetle(x) } catch (e) { continue }
      if (S.kod === 'gecti') continue;
      let P = [];
      try { P = pozisyonlar(x, p, S, O) } catch (e) { P = [{ i: -1, ad: konu(x), grup: 'bak', sartlar: [], neden: 'Bu ilanı okuyamadım, ilandan kendin bak.', adet: O.kisi }] }
      const poz = P.map(z => ({ anahtar: x.id + '#' + z.i, i: z.i, ad: yazi(z.ad), grup: z.grup, neden: yazi(z.neden), adet: tam(z.adet), ildeki: tam(z.ildeki),
        tablosuz: !!z.tablosuz, kpssPuan: sayi(z.kpssPuan), sartlar: (z.sartlar || []).map(sart) }));
      tum.push(...poz);
      cikti.push({
        id: x.id, eklendi: x.eklendi || 0, kurum: kurumAd(x), kurumKisa: kurumKisa(x), konu: konu(x), konuKisa: konuKisa(x), kaynak: x.kaynak || null, duyuru: !!x.duyuru, eksik: !!x.eksik,
        sure: { kod: S.kod, kisa: S.kisa, baslik: S.baslik, not: S.not || [], son: S.son ? iso(S.son.zaman) : null, bas: S.bas ? iso(S.bas.zaman) : null },
        ozet: { tur: O.tur ? yazi(O.tur) : null, turAd: O.turAd ? yazi(O.turAd) : null, kisi: tam(O.kisi), ilanNe: yazi(O.ilanNe), yer: yazi(O.yer), link: O.link ? yazi(O.link) : null,
          adimlar: (O.adimlar || []).map(yazi), etiketler: (O.etiketler || []).map(yazi), ilkDefa: !!O.ilkDefa },
        pozisyonlar: poz
      });
    }
    const puanlar = Motor.puanListe(p);
    return JSON.stringify({
      ilanlar: cikti,
      profil: {
        doluluk: doluluk(p), bos: bosAlanlar(p).filter(e => ALANLAR[e]).map(e => ({ alan: e, ad: ALANLAR[e][0], adim: ALANLAR[e][1] })),
        eksikler: eksikler(tum).map(([e, n]) => ({ alan: e, ad: ALANLAR[e][0], adim: ALANLAR[e][1], etkiledigi: n })),
        engeller: engeller(tum).map(([ad, n]) => ({ ad, n })),
        hedefPuan: hedefPuan(tum), enYuksekPuan: Math.max(0, ...puanlar.map(x => x.puan || 0))
      }
    });
  }

  // Ayrıntı ekranı için ağır bilgiler (yalnız açılan ilan): istenen belgeler, kadronun ne iş yaptığı
  // kadroSira: tablolu ilanda kadronun sırası (yoksa -1); profil: taban kıyası için (uygulama.html bilgiKart ile aynı hesap)
  function ayrinti(ilanMetin, kadroAd, kadroSira, profilMetin) {
    const x = JSON.parse(ilanMetin);
    let belgeler = [], isNe = null, taban = null, statu = null;
    try { belgeler = Ozet.belgeler(x.metin) } catch (e) { }
    try { isNe = kadroAd ? yazi(Ozet.isNe(kadroAd)) || null : null } catch (e) { }
    try { statu = yazi(Ozet.ozetle(x).ilanNe).replace(/^.*?alıyor\. /, '') || null } catch (e) { }
    try {
      const i = kadroSira == null ? -1 : +kadroSira, p = JSON.parse(profilMetin || '{}') || {};
      if (x.B && x.B.kadrolar && i >= 0 && kok.Taban) {
        const S = Sure.durum(Sure.bul(x.metin)), t = S.son ? S.son.zaman : new Date();
        const k = Bolucu.degerlendir(x.B, p, t).kadrolar[i];
        const tg = kok.Taban.bagla(x.B.kadrolar, kok.TABAN_VERI || [], x.metin)[i], A = tg && tg[0];
        if (A && k && k.kpssPuan) {
          const L = Object.values(A.iller).filter(v => v.asil != null);
          const yeter = L.filter(v => kok.Taban.kiyas(v, k.kpssPuan, A).kod === 'asil').length;
          if (L.length) taban = { yil: yazi(A.yil), il: L.length, yeter };
        }
      }
    } catch (e) { }
    return JSON.stringify({ belgeler, isNe, statu, taban, metin: x.metin });
  }

  // Sihirbaz için listeler: okula göre bölümler, iller, belgeler, okula göre varsayılan puan türü
  function sabitler() {
    return JSON.stringify({ bolumler: kok.BOLUMLER, iller: Il.ILLER, belgeler: Motor.BELGELER, puanOkul: Motor.PUAN_OKUL, alanlar: ALANLAR });
  }
  // Sihirbazdaki canlı sayaç: taslak profille kaç uygun / kontrol
  function say(ilanlarMetin, profilMetin, bugunMetin) {
    const r = JSON.parse(hesapla(ilanlarMetin, profilMetin, bugunMetin)), s = { uygun: 0, bak: 0 };
    r.ilanlar.forEach(x => x.pozisyonlar.forEach(z => { if (z.grup in s) s[z.grup]++ }));
    return JSON.stringify(s);
  }

  kok.MemurOlCekirdek = { hesapla, ayrinti, sabitler, say, surum: 1 };
})(this);
