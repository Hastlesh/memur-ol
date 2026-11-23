/* Şartım Tamam - bildirim.
   Uygulama kapalıyken de çalması için hatırlatmayı telefonun takvimi çalar.
   Tek dokunuş = son günden 3 gün önce başlayan günlük tekrarlı etkinlik. */
(function (kok) {
  'use strict';
  const iki = n => String(n).padStart(2, '0');
  const gunEkle = (d, n, saat = 0, dk = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, saat, dk);
  const damga = d => `${d.getFullYear()}${iki(d.getMonth() + 1)}${iki(d.getDate())}T${iki(d.getHours())}${iki(d.getMinutes())}00`;
  const gunFarki = (a, b) => Math.round((gunEkle(b, 0) - gunEkle(a, 0)) / 864e5);
  const ONCE = 30; // Google Takvim'in varsayılan uyarısı: 30 dk önce

  // Son tarihe kadar, her gün aynı saatte. Geçmişe ya da son tarihten sonraya alarm kurmaz.
  function seri(son, simdi, saat = 10) {
    if (!son || simdi >= son) return null;
    let sonGun = son, s = saat;
    // Öğleden önce kapanıyorsa hatırlatma bir gün önce biter.
    if (gunEkle(son, 0, s) > son - 2 * 3600e3) sonGun = gunEkle(son, -1);
    let bas = gunEkle(sonGun, -3, s);
    while (bas - ONCE * 60e3 <= simdi && gunFarki(bas, sonGun) >= 0) bas = gunEkle(bas, 1, s);
    const adet = gunFarki(bas, sonGun) + 1;
    if (adet > 0) return { bas, adet };
    // Vakit daraldı: bir kez, birazdan.
    const hemen = new Date(Math.ceil((+simdi + (ONCE + 5) * 60e3) / 300e3) * 300e3);
    return hemen < son ? { bas: hemen, adet: 1 } : null;
  }

  function adres(baslik, ayrinti, olay) {
    const q = [
      'action=TEMPLATE',
      'text=' + encodeURIComponent(baslik),
      'dates=' + damga(olay.bas) + '/' + damga(new Date(+olay.bas + 15 * 60e3)),
      'ctz=Europe/Istanbul',
      'details=' + encodeURIComponent(ayrinti)
    ];
    if (olay.adet > 1) q.push('recur=' + encodeURIComponent(`RRULE:FREQ=DAILY;COUNT=${olay.adet}`));
    return 'https://calendar.google.com/calendar/render?' + q.join('&');
  }

  const yaz = (d, saatli = true) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' }) + (saatli ? ` ${iki(d.getHours())}:${iki(d.getMinutes())}` : '');

  // b = Sure.bul(), S = Sure.durum()
  function planla(ad, b, S, simdi = new Date(), saat = 10) {
    if (S.kod === 'gecti' || !S.son) return [];
    const isler = [], kisa = String(ad).slice(0, 70);
    const ekle = (tur, dugme, baslik, ayrinti, olay) => {
      if (!olay) return;
      const ilkUyari = new Date(olay.bas - ONCE * 60e3);
      isler.push({ tur, dugme, bas: olay.bas, adet: olay.adet, adres: adres(baslik, ayrinti, olay),
        aciklama: olay.adet > 1 ? `${olay.adet} gün üst üste, ilki ${yaz(ilkUyari)}` : `bir kez, ${yaz(ilkUyari)}` });
    };
    const son = S.son.zaman, sonYazi = yaz(son, S.son.saatVar);
    ekle('son', 'Son gün alarmını kur', `Son başvuru ${sonYazi}: ${kisa}`,
      `${ad}\nSon başvuru: ${sonYazi}\nSüre uzamış ya da değişmiş olabilir, kurumun sitesinden kontrol et.`, seri(son, simdi, saat));

    const acilis = b.baslar[0] && b.baslar[0].zaman;
    if (acilis && acilis > simdi && acilis < son) {
      let bas = gunEkle(acilis, 0, saat);
      if (bas < acilis) bas = new Date(+acilis);
      if (bas - ONCE * 60e3 > simdi) ekle('acilis', 'Açılış alarmını kur', `Başvuru açıldı: ${kisa}`, `${ad}\nSon başvuru: ${sonYazi}`, { bas, adet: 1 });
    }
    for (const t of b.teslimler) {
      if (gunFarki(son, t.zaman) === 0 || t.zaman <= simdi) continue;
      const tYazi = yaz(t.zaman, t.saatVar);
      ekle('teslim', 'Belge teslim alarmını kur', `Belge teslimi ${tYazi}: ${kisa}`,
        `${ad}\nBelgeleri teslim için son gün: ${tYazi}. Teslim etmezsen başvurun sayılmaz.`, seri(t.zaman, simdi, saat));
    }
    return isler;
  }

  const api = { seri, adres, planla };
  if (typeof module !== 'undefined') module.exports = api; else kok.Bildirim = api;
})(this);
