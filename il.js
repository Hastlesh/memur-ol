/* Şartım Tamam - il dağılımı (Ek-1).
   1) "satır = il, sütun = kadro" tablosunu okur
   2) her satırı ve sütunu tablodaki toplamla sağlar
   3) sütunu kadroya ancak hem adı hem kontenjanı tutarsa bağlar, tahmin etmez */
(function (kok) {
  'use strict';

  const ILLER = ('Adana,Adıyaman,Afyonkarahisar,Ağrı,Aksaray,Amasya,Ankara,Antalya,Ardahan,Artvin,Aydın,Balıkesir,Bartın,Batman,' +
    'Bayburt,Bilecik,Bingöl,Bitlis,Bolu,Burdur,Bursa,Çanakkale,Çankırı,Çorum,Denizli,Diyarbakır,Düzce,Edirne,Elazığ,Erzincan,' +
    'Erzurum,Eskişehir,Gaziantep,Giresun,Gümüşhane,Hakkâri,Hatay,Iğdır,Isparta,İstanbul,İzmir,Kahramanmaraş,Karabük,Karaman,' +
    'Kars,Kastamonu,Kayseri,Kırıkkale,Kırklareli,Kırşehir,Kilis,Kocaeli,Konya,Kütahya,Malatya,Manisa,Mardin,Mersin,Muğla,Muş,' +
    'Nevşehir,Niğde,Ordu,Osmaniye,Rize,Sakarya,Samsun,Siirt,Sinop,Sivas,Şanlıurfa,Şırnak,Tekirdağ,Tokat,Trabzon,Tunceli,Uşak,' +
    'Van,Yalova,Yozgat,Zonguldak').split(',');

  // Büyük-küçük ve Türkçe harf farkı gözetmez: "IZMIR" = "İzmir"
  const sade = s => String(s || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  const TAKMA = { afyon: 'Afyonkarahisar', maras: 'Kahramanmaraş', urfa: 'Şanlıurfa', izmit: 'Kocaeli', antep: 'Gaziantep', icel: 'Mersin' };
  const SADE_IL = new Map(ILLER.map(i => [sade(i), i]));

  function ilBul(yazi) {
    const s = sade(yazi);
    if (SADE_IL.has(s)) return SADE_IL.get(s);
    if (TAKMA[s]) return TAKMA[s];
    // "İSTANBUL (Bakırköy)", "ANKARA / Sincan"
    const bas = String(yazi || '').match(/^([^(\/\n-]+)\s*[(\/-]/);
    return bas && SADE_IL.get(sade(bas[1])) || null;
  }

  function tercihler(yazi) {
    const iller = new Set(), taninmayan = [];
    for (const parca of String(yazi || '').split(/[,;\/]+/).map(x => x.trim()).filter(Boolean)) {
      const il = ilBul(parca);
      if (il) { iller.add(il); continue; }
      // Virgülsüz yazım: "Antalya Burdur"
      const tek = parca.split(/\s+/).map(ilBul);
      if (tek.every(Boolean)) tek.forEach(i => iller.add(i)); else taninmayan.push(parca);
    }
    return { iller: [...iller], taninmayan };
  }

  const orta = c => (c.x0 + c.x1) / 2;
  const kapsar = (c, x) => x >= c.x0 && x <= c.x1;
  const tamSayi = s => /^(\d{1,3}(\.\d{3})+|\d+)$/.test(s) ? Number(s.replace(/\./g, '')) : null;

  function baslikOku(t) {
    const ilH = t.hucre.find(c => c.r0 <= 4 && c.yazi.length < 30 &&
      /^(il|iller|ili|il adi|sehir|birim il|il birim|teskilat il|il sinav merkezi|gorev yeri il|il gorev yeri)$/.test(sade(c.yazi)));
    if (!ilH) return null;
    let ilk = ilH.r1 + 1;
    while (ilk < t.satir && !t.hucre.some(c => c.r0 === ilk && kapsar(c, orta(ilH)) && ilBul(c.yazi))) ilk++;
    if (ilk >= t.satir) return null;
    const x0 = Math.min(...t.hucre.map(c => c.x0)), en = Math.max(...t.hucre.map(c => c.x1)) - x0;
    const bas = t.hucre.filter(c => c.r1 < ilk && c.yazi && c.x1 - c.x0 < en * 0.97).sort((a, b) => a.r0 - b.r0);
    const sutun = [];
    for (const c of t.hucre.filter(c => c.r0 === ilk && c.r1 === ilk).sort((a, b) => a.x0 - b.x0)) {
      const x = orta(c);
      if (x < ilH.x1) continue;          // il ve sıra no sütunları
      const yol = bas.filter(b => kapsar(b, x)).map(b => b.yazi.replace(/\s+/g, ' '))
        .filter(y => !/^(pozisyon|pozisyonlar|unvan|kontenjan|kadro|adet)$/.test(sade(y)));
      sutun.push({ ad: yol.join(' ') || 'Kontenjan', x0: c.x0, x1: c.x1, toplamMi: yol.some(y => /^(genel )?toplam/.test(sade(y))) });
    }
    return sutun.length ? { ilX0: ilH.x0, ilX1: ilH.x1, sutun, ilk } : null;
  }

  // "2026 YILI SÖZLEŞMELİ ..." başlığındaki alım yılı
  const alimYili = yazi => { const m = sade(String(yazi || '').slice(0, 1500)).match(/(20\d\d) yili sozlesmeli/); return m ? +m[1] : null };
  const ilTablosuMu = t => !!baslikOku(t);

  function oku(tablolar) {
    const listeler = [];
    let L = null;
    for (const t of tablolar || []) {
      const b = baslikOku(t);
      let basla = 0;
      if (b) {
        const ayni = L && !L.kapali && L.sutun.length === b.sutun.length && L.sutun.every((s, i) => s.ad === b.sutun[i].ad);
        if (!ayni) {
          L = { yil: alimYili(t.hucre.filter(c => c.r1 < b.ilk).map(c => c.yazi).join(' ')), sutun: b.sutun.map(s => ({ ad: s.ad, toplamMi: s.toplamMi, iller: {}, toplam: 0, yazan: null })), hata: [], kapali: false };
          listeler.push(L);
        }
        L.duzen = b; basla = b.ilk;
      } else {
        // Başlıksız devam sayfası: sütunlar aynı hizada olmalı.
        if (!L || L.kapali || !L.duzen.sutun.every(s => t.hucre.some(c => Math.abs(c.x0 - s.x0) < 5 && Math.abs(c.x1 - s.x1) < 5))) continue;
      }
      const ilX = (L.duzen.ilX0 + L.duzen.ilX1) / 2, sayilan = new Set();
      for (let r = basla; r < t.satir; r++) {
        const satir = t.hucre.filter(c => c.r0 <= r && c.r1 >= r);
        const toplamS = satir.some(c => c.x0 < L.duzen.ilX1 && /^(genel )?toplam$/.test(sade(c.yazi)));
        const yer = ((satir.find(c => kapsar(c, ilX)) || {}).yazi || '').replace(/\s+/g, ' ');
        let satirT = 0, yazanT = null, dolu = false;
        L.duzen.sutun.forEach((d, i) => {
          const h = satir.find(c => kapsar(c, (d.x0 + d.x1) / 2));
          const ham = h ? h.yazi.replace(/\s/g, '') : '';
          if (!ham || /^[-–—]+$/.test(ham) || sayilan.has(h)) return;
          sayilan.add(h);
          const n = tamSayi(ham), s = L.sutun[i];
          if (n == null || (!toplamS && !yer)) {
            if (r >= basla && (yer || toplamS)) L.hata.push(`${yer || 'Toplam'} satırında "${ham.slice(0, 20)}" okunamadı.`);
            return;
          }
          if (toplamS) { s.yazan = n; return; }
          if (s.toplamMi) yazanT = n;
          else { satirT += n; dolu = true; }
          const ad = ilBul(yer) || yer;
          s.iller[ad] = (s.iller[ad] || 0) + n; s.toplam += n;
        });
        if (toplamS) { L.kapali = true; break; }
        if (yazanT != null && (dolu || yazanT) && yazanT !== satirT) L.hata.push(`${yer}: satır toplamı ${yazanT}, okunan ${satirT}.`);
      }
    }
    for (const l of listeler) {
      for (const s of l.sutun) if (s.yazan != null && s.yazan !== s.toplam) l.hata.push(`${s.ad}: yazan toplam ${s.yazan}, okunan ${s.toplam}.`);
      l.sutun = l.sutun.filter(s => !s.toplamMi);
    }
    return listeler;
  }

  const GEREKSIZ = new Set('ve veya ile icin pozisyonu kadrosu'.split(' '));
  const kelime = s => new Set(sade(s).split(' ').filter(w => w && !GEREKSIZ.has(w)));

  function bagla(kadrolar, listeler, ilanMetni) {
    const ilanYili = alimYili(ilanMetni);
    const harita = kadrolar.map(() => null), uyari = [], aday = [];
    for (const l of listeler) {
      if (l.hata.length) {
        uyari.push(`İl tablosunda sağlama tutmadı, o tabloyu kullanmıyorum. ${l.hata.slice(0, 2).join(' ')}`);
        continue;
      }
      if (ilanYili && l.yil && ilanYili !== l.yil) {
        uyari.push(`Bu Ek-1 ${l.yil} yılının, ilan ise ${ilanYili}. Kullanmıyorum.`);
        continue;
      }
      const buListe = [], sorunlu = [];
      for (const s of l.sutun) {
        if (!s.toplam) continue;
        const sk = kelime(s.ad), puanli = [];
        kadrolar.forEach((k, i) => {
          if (k.adet !== s.toplam) return;
          const kk = kelime([k.ad, k.cinsiyet, k.kod].filter(Boolean).join(' '));
          if (![...sk].every(w => kk.has(w))) return;
          puanli.push({ i, puan: sk.size / kk.size });
        });
        if (!puanli.length) {
          // Ek branşı yazar ("Makine Mühendisi"), ilan grup adını ("Mühendis 3. Grup").
          // Kontenjan tek kadroda varsa ve branşın her kelimesi o kadronun şartında geçiyorsa bağlanır.
          const ayni = kadrolar.map((k, i) => ({ k, i })).filter(x => x.k.adet === s.toplam);
          if (ayni.length === 1) {
            const k = ayni[0].k, metin = [...kelime([k.ad, k.okul, k.bolum, k.nitelik, k.ozel].filter(Boolean).join(' '))];
            if ([...sk].every(w => metin.some(m => w.length >= 6 ? m.startsWith(w.slice(0, -1)) : m === w))) puanli.push({ i: ayni[0].i, puan: 1 });
          }
        }
        puanli.sort((a, b) => b.puan - a.puan);
        if (puanli.length && (puanli.length === 1 || puanli[0].puan > puanli[1].puan)) buListe.push({ s, i: puanli[0].i });
        else sorunlu.push(s);
      }
      // Ya bütün sütunlar tutar ya hiçbiri: başka ilanın ekinde birkaç sütun tesadüfen tutabilir.
      if (sorunlu.length) uyari.push(`Ek-1 bu ilanla tutmuyor, kullanmıyorum: "${sorunlu[0].ad}" (${sorunlu[0].toplam} kişi) ilanda yok. Doğru ek mi?`);
      else aday.push(...buListe);
    }
    for (const a of aday) {
      if (aday.filter(x => x.i === a.i).length === 1) harita[a.i] = a.s.iller;
      else uyari.push(`"${kadrolar[a.i].ad}" için birden çok il sütunu çıktı, bağlamadım.`);
    }
    const bagli = harita.filter(Boolean).length;
    if (bagli && bagli < kadrolar.length) uyari.push(`${kadrolar.length} kadronun ${bagli} tanesinin illeri bulundu. Kalanları Ek-1'den kendin kontrol et.`);
    return { harita, uyari, bagli, tam: bagli === kadrolar.length };
  }

  const api = { ILLER, ilBul, tercihler, oku, bagla, alimYili, ilTablosuMu };
  if (typeof module !== 'undefined') module.exports = api; else kok.Il = api;
})(this);
