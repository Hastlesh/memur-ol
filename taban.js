/* Şartım Tamam - geçmiş taban puanlar.
   Sadece aynı kurumun, aynı adlı kadrosunu ve aynı KPSS sınavının puanını kıyaslar.
   "Kazanırsın" demez, geçen alımda ne olurdu onu söyler. */
(function (kok) {
  'use strict';
  const Il = typeof module !== 'undefined' ? require('./il.js') : kok.Il;

  const sade = s => String(s || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  const anahtar = s => [...new Set(sade(s).split(' ').filter(w => w && w !== 've'))].sort().join(' ');
  const orta = c => (c.x0 + c.x1) / 2;
  const puanOku = s => {
    const t = String(s || '').replace(/\s/g, '');
    if (!t || /^[-–—]+$/.test(t)) return null;
    return /^\d{2,3}([.,]\d+)?$/.test(t) && Number(t.replace(',', '.')) <= 100 ? Number(t.replace(',', '.')) : NaN;
  };

  // Yerleştirme istatistiği: "Kadro / İL | asıl en düşük | yedek en düşük"
  function oku(tablolar) {
    let sutun = null, kurum = '', yil = null;
    const satirlar = [], hata = [];
    for (const t of tablolar || []) {
      const adH = t.hucre.find(c => c.r0 <= 4 && /^(pozisyon|pozisyon adi|kadro|kadro adi|unvan|unvan adi)$/.test(sade(c.yazi)));
      const asilH = t.hucre.find(c => c.r0 <= 4 && /^(?=.*asil)(?=.*dusuk)/.test(sade(c.yazi)) && c.yazi.length < 60);
      let basla = 0;
      if (adH && asilH) {
        const yedekH = t.hucre.find(c => c.r0 <= 4 && /^(?=.*yedek)(?=.*dusuk)/.test(sade(c.yazi)) && c.yazi.length < 60);
        sutun = { ad: orta(adH), asil: orta(asilH), yedek: yedekH ? orta(yedekH) : null };
        basla = Math.max(adH.r1, asilH.r1) + 1;
        const baslik = t.hucre.filter(c => c.r1 < adH.r0).map(c => c.yazi).join('\n');
        if (!kurum) kurum = baslik.split('\n').find(s => /BAKANLI|ÜNİVERSİTE|BELEDİYE|BAŞKANLI|KURUMU|AJANSI/i.test(s)) || '';
        if (!yil) yil = +((baslik.match(/(20\d\d)\s+YIL/i) || [])[1] || 0) || null;
      }
      if (!sutun) continue;
      for (let r = basla; r < t.satir; r++) {
        const al = x => ((t.hucre.find(c => c.r0 <= r && c.r1 >= r && x >= c.x0 && x <= c.x1) || {}).yazi || '').replace(/\s+/g, ' ').trim();
        const ad = al(sutun.ad), i = ad.lastIndexOf('/');
        if (!ad) continue;
        const il = i > 0 ? Il.ilBul(ad.slice(i + 1).trim()) : null;
        if (!il) { hata.push(`"${ad.slice(0, 60)}" satırında il yok.`); continue }
        const asil = puanOku(al(sutun.asil)), yedek = sutun.yedek == null ? null : puanOku(al(sutun.yedek));
        // Yedek asıldan büyükse sütunlar kaymıştır.
        if (Number.isNaN(asil) || Number.isNaN(yedek) || (asil != null && yedek != null && yedek > asil)) { hata.push(`"${ad.slice(0, 60)}" puanı okunamadı.`); continue }
        satirlar.push([ad.slice(0, i).trim(), il, asil, yedek]);
      }
    }
    return satirlar.length ? { kurum, yil, kpssYil: null, satirlar, hata } : null;
  }

  // Her kadro için eski alımlar, yeniden eskiye.
  function bagla(kadrolar, setler, ilanMetni) {
    const bas = ` ${sade(String(ilanMetni || '').slice(0, 300))} `;
    const uygun = (setler || []).filter(s => s.kurum && !(s.hata || []).length && bas.includes(sade(s.kurum)))
      .sort((a, b) => (b.yil || 0) - (a.yil || 0));
    return kadrolar.map(k => {
      const a = anahtar(k.ad), liste = [];
      for (const s of uygun) {
        if (liste.some(x => x.yil === s.yil)) continue;
        const iller = {};
        for (const [ad, il, asil, yedek] of s.satirlar) if (anahtar(ad) === a) iller[il] = { asil, yedek };
        if (Object.keys(iller).length) liste.push({ yil: s.yil, kpssYil: s.kpssYil, iller });
      }
      return liste;
    });
  }

  // kod: asil | sinir | yedek | geride | veriyok | puanyok | farkli | bilinmiyor
  function kiyas(kayit, secilen, alim) {
    if (!kayit || kayit.asil == null) return { kod: 'veriyok' };
    if (!secilen) return { kod: 'puanyok' };
    if (!alim.kpssYil || !secilen.yil) return { kod: 'bilinmiyor' };
    if (alim.kpssYil !== secilen.yil) return { kod: 'farkli' };
    const fark = secilen.puan - kayit.asil;
    if (Math.abs(fark) < 0.01) return { kod: 'sinir', fark };
    if (fark > 0) return { kod: 'asil', fark };
    if (kayit.yedek != null && secilen.puan >= kayit.yedek) return { kod: 'yedek', fark };
    return { kod: 'geride', fark };
  }

  const api = { oku, bagla, kiyas };
  if (typeof module !== 'undefined') module.exports = api; else kok.Taban = api;
})(this);
