/* Şartım Tamam - başvuru süresi.
   Sadece başvuruya bağlı tarihleri alır; doğum, itiraz, yönetmelik tarihlerini almaz.
   Bulamazsa "süre var" demez. */
(function (kok) {
  'use strict';

  const AY = 'ocak şubat mart nisan mayıs haziran temmuz ağustos eylül ekim kasım aralık'.split(' ');
  const A = AY.join('|');
  // Tam tarih: 24.05.2026, 24/05/2026, 24 Mayıs 2026
  const TAM = `(?<![\\d./])\\d{1,2}(?: ?[./] ?\\d{1,2} ?[./] ?| (?:${A}) )20\\d\\d(?!\\d)`;
  // Aralığın başı eksik olabilir: "18 - 24 Mayıs 2026", "28 Kasım - 5 Aralık 2026"
  const BAS = `(?:${TAM}|(?<![\\d./])\\d{1,2} (?:${A})|(?<![\\d./])\\d{1,2}(?= ?[-–—] ?\\d{1,2} (?:${A})))`;
  const GUN = '(?: ?(?:pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)(?![a-zçğıöşü]))?';
  const SAAT = `${GUN}[\\])]?(?:,? ?(?:günü |tarihi |tarihinde )?(?:saat:? ?|\\( ?(?:saat:? ?)?)(\\d{1,2}[.:]\\d\\d)(?:['’][a-zçğıöşü]+)? ?\\)?)?`;
  const AYRAC = `(?: ?[-–—/] ?| ile | ve | tarihinden | tarihinde başlayıp,? ?| tarihinde başlayacak,? (?:ve )?| ?(?:itibarıyla |itibariyle )?başlayacak,? (?:ve )?| ?(?:itibarıyla |itibariyle )?başlayıp,? ?)`;

  function tarih(yazi, ornek) {
    const s = String(yazi).trim();
    let g, a, y, m;
    if ((m = s.match(/^(\d{1,2}) ?[./] ?(\d{1,2}) ?[./] ?(20\d\d)$/))) [g, a, y] = [+m[1], +m[2], +m[3]];
    else if ((m = s.match(/^(\d{1,2})(?: ([^\d\s]+))?(?: (20\d\d))?$/))) {
      g = +m[1];
      a = m[2] ? AY.indexOf(m[2]) + 1 : ornek && ornek.a;
      y = m[3] ? +m[3] : ornek && ornek.y;
      // "28 Aralık - 5 Ocak 2027"
      if (!m[3] && ornek && a > ornek.a) y--;
    } else return null;
    if (!a || !y) return null;
    const d = new Date(y, a - 1, g);
    return d.getMonth() === a - 1 && d.getDate() === g ? { g, a, y } : null;
  }

  function an(t, saat, sonMu) {
    let [s, dk] = sonMu ? [23, 59] : [0, 0];
    if (saat) {
      const [x, z] = saat.split(/[.:]/).map(Number);
      if (x < 24 && z < 60) [s, dk] = [x, z];
      else if (x === 24 && !z) [s, dk] = [23, 59];
    }
    return new Date(t.y, t.a - 1, t.g, s, dk, sonMu ? 59 : 0);
  }

  function bul(metin) {
    const T = String(metin || '').normalize('NFC').replace(/([a-zçğıöşü])-\n(?=[a-zçğıöşü])/g, '$1').replace(/\s+/g, ' ');
    const k = T.toLocaleLowerCase('tr-TR');
    const baslar = [], sonlar = [], teslimler = [];
    const once = (m, n) => k.slice(Math.max(0, m.index - n), m.index);
    const sonra = (m, n) => k.slice(m.index + m[0].length, m.index + m[0].length + n);
    const alinti = m => T.slice(Math.max(0, m.index - 70), m.index + m[0].length + 70).trim();

    // 1. Başlangıç - bitiş aralığı
    for (const m of k.matchAll(new RegExp(`\\[?(${BAS})${SAAT}${AYRAC}\\[?(${TAM})${SAAT}`, 'g'))) {
      const o = once(m, 130), yakin = once(m, 45), s = sonra(m, 130);
      // "28.10.2026-11.11.2026 tarihleri arasında e-Devlet Kapısı üzerinden ... başvuru": sözcük uzakta olabilir
      if (!/başvur|müracaat/.test(o + ' ' + s) && !(/^ ?tarihleri aras/.test(s) && /başvur|müracaat/.test(sonra(m, 280)))) continue;
      if (/itiraz|sınav(ı|lar)? tarih|sonuç|doğum|teslim|tercih tarih|göreve başla/.test(yakin)) continue;
      if (/^.{0,25}(itiraz|doğumlu|tarihli ve)/.test(s)) continue;
      const b2 = tarih(m[3]), b1 = b2 && tarih(m[1], b2);
      if (!b1 || !b2) continue;
      const gun = (an(b2) - an(b1)) / 864e5;
      if (gun < 0 || gun > 100) continue;
      baslar.push({ t: b1, saat: m[2], yer: alinti(m) });
      sonlar.push({ t: b2, saat: m[4] || (s.match(/^ ?tarihleri aras[^.;]{0,15}saat:? ?(\d{1,2}[.:]\d\d)['’]?[a-zçğıöşü]* kadar/) || [])[1], yer: alinti(m) });
    }
    // 2. Etiketli tarihler
    for (const m of k.matchAll(new RegExp(`(?:son (?:başvuru|müracaat)|başvuru(?:ların)? (?:bitiş|son)|müracaat bitiş) (?:tarihi|günü|tarih)(?: ve saati)?(?: olan)? ?[:;(\\[–-]? ?(${TAM})${SAAT}`, 'g'))) {
      const t = tarih(m[1]);
      if (t) sonlar.push({ t, saat: m[2], yer: alinti(m) });
    }
    for (const m of k.matchAll(new RegExp(`(?:başvuru(?:ların)? (?:başlangıç|başlama)|ilk başvuru) tarihi ?[:;(\\[–-]? ?(${TAM})${SAAT}`, 'g'))) {
      const t = tarih(m[1]);
      if (t) baslar.push({ t, saat: m[2], yer: alinti(m) });
    }
    // 3. "... tarihine kadar" ve belge teslimi (başvurudan ayrı gün olabilir)
    for (const m of k.matchAll(new RegExp(`(?:(en geç|elden teslim tarihi) ?:? ?)?(${TAM})${SAAT}`, 'g'))) {
      const t = tarih(m[2]);
      if (!t) continue;
      const s = sonra(m, 150);
      if (m[1] === 'elden teslim tarihi' || (m[1] && /teslim|şahsen/.test(s) && /başvuru bilgileri|başvuru belge/.test(once(m, 200) + s))) {
        teslimler.push({ t, saat: m[3], yer: alinti(m) });
      } else if (/^ ?(tarihine|tarihi|günü|mesai bitimine)?[^.;]{0,35}kadar[^.;]{0,90}(başvur|müracaat)/.test(s) && !/itiraz|teslim|sonuç/.test(s.slice(0, 90)) &&
        !/(asıl|asil|yedek|kazanan) aday|istenilen belge|atanmaya/.test(once(m, 160))) {
        sonlar.push({ t, saat: m[3], yer: alinti(m) });
      }
    }
    // Saat ayrı cümlede: "bitiş tarihinde saat 13:00'te"
    const bitisSaat = (k.match(/(?:bitiş tarihinde|bitiş günü|son gün(ü)?) saat:? ?(\d{1,2}[.:]\d\d)/) || [])[2];
    const basSaat = (k.match(/başlangıç tarihinde saat:? ?(\d{1,2}[.:]\d\d)/) || [])[1];

    function topla(liste, sonMu, ortakSaat) {
      const gunler = new Map();
      for (const x of liste) {
        const ad = `${x.t.y}-${x.t.a}-${x.t.g}`, v = gunler.get(ad);
        if (!v || (!v.saat && x.saat)) gunler.set(ad, { ...x });
      }
      return [...gunler.values()].map(x => {
        const saat = x.saat || ortakSaat;
        return { zaman: an(x.t, saat, sonMu), saatVar: !!saat, yer: x.yer };
      }).sort((a, b) => a.zaman - b.zaman);
    }
    return {
      baslar: topla(baslar, false, basSaat),
      sonlar: topla(sonlar, true, bitisSaat),
      teslimler: topla(teslimler, true),
      uzatma: /süre(si|leri)? [^.]{0,30}uzatıl(mıştır|dı)/.test(k)
    };
  }

  const gunFarki = (a, b) => Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);
  const saatYaz = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const yaz = x => `${x.zaman.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}${x.saatVar ? ' saat ' + saatYaz(x.zaman) : ''}`;

  // kod: gecti | acilmadi | bugun | az | acik | belirsiz; bas: başvurunun açıldığı gün (biliniyorsa)
  function durum(b, simdi = new Date()) {
    const r = durum0(b, simdi);
    r.bas = b.baslar[0] || null;
    return r;
  }
  function durum0(b, simdi) {
    const not = [];
    if (b.uzatma) not.push('İlanda süre uzatımından söz ediliyor, kurumun sitesinden son tarihe bak.');
    if (!b.sonlar.length) return { kod: 'belirsiz', kisa: 'tarih?', baslik: 'Son başvuru gününü bulamadım, ilandan kendin bak', not, son: null };

    const ilk = b.sonlar[0], enSon = b.sonlar[b.sonlar.length - 1];
    const hepsiGecti = simdi > enSon.zaman;
    // Çelişkide: hepsi geçtiyse geçti, değilse en erkeni esas al.
    const son = hepsiGecti ? enSon : ilk;
    if (b.sonlar.length > 1) not.push(`İlanda farklı son tarihler var (${b.sonlar.map(yaz).join(' / ')}). En erkenini esas al.`);
    for (const t of b.teslimler)
      if (gunFarki(son.zaman, t.zaman) !== 0)
        not.push(simdi > t.zaman ? `Belge teslimi de bitti: ${yaz(t)}.` : `Ayrıca belgeleri teslim için son gün: ${yaz(t)}. Yoksa başvurun sayılmaz.`);

    if (simdi > son.zaman) {
      const g = gunFarki(son.zaman, simdi);
      if (!hepsiGecti) return { kod: 'belirsiz', kisa: 'tarih?', baslik: 'Son tarih çelişkili, ilkine göre süre bitti', not, son };
      return { kod: 'gecti', kisa: 'geçti', baslik: `SÜRESİ GEÇTİ: ${g ? g + ' gün önce' : 'bugün'} bitti (${yaz(son)})`, not, son };
    }
    const kalan = gunFarki(simdi, son.zaman);
    if (!son.saatVar) not.push('Bitiş saati yazmıyor. Mesai bitiminde kapanabilir, son günü bekleme.');
    const bas = b.baslar[0];
    if (bas && simdi < bas.zaman) {
      const g = gunFarki(simdi, bas.zaman);
      return { kod: 'acilmadi', kisa: g ? `${g} gün sonra açılır` : 'bugün açılır', baslik: `Henüz açılmadı: ${g ? g + ' gün sonra' : 'bugün'} açılıyor (${yaz(bas)}). Son gün ${yaz(son)}`, not, son };
    }
    if (!kalan) return { kod: 'bugun', kisa: 'BUGÜN', baslik: `BUGÜN SON GÜN: ${yaz(son)}`, not, son };
    return { kod: kalan <= 3 ? 'az' : 'acik', kisa: `${kalan} gün`, baslik: `${kalan === 1 ? 'YARIN SON GÜN' : kalan + ' gün kaldı'}: ${yaz(son)}`, not, son };
  }

  const api = { bul, durum };
  if (typeof module !== 'undefined') module.exports = api; else kok.Sure = api;
})(this);
