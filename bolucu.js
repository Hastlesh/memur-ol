/* Şartım Tamam - ilanı kadrolara böler.
   1) PDF'deki çizgilerden tablo hücrelerini kurar
   2) "... pozisyonu için;" başlıklı özel şartları ilgili kadroya bağlar
   3) kontenjan toplamını ilandaki toplamla sağlar */
(function (kok) {
  'use strict';
  const Motor = typeof module !== 'undefined' ? require('./motor.js') : kok.Motor;
  const Il = typeof module !== 'undefined' ? require('./il.js') : kok.Il;

  // Bazı PDF'ler "ğ"yi "g" + işaret diye yazar; hepsi tek biçime çevrilir.
  const kucuk = s => String(s || '').normalize('NFC').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
  const harf = s => kucuk(s).replace(/[^a-zçğıöşüâîû0-9]/g, '');
  const tekil = a => [...new Set(a)];
  const duz = s => String(s || '').normalize('NFC').replace(/([a-zçğıöşü])-\n(?=[a-zçğıöşü])/g, '$1').replace(/\s+/g, ' ').trim();

  /* ---------- PDF: çizgiler ve hücreler ---------- */

  function cizgiler(opList, OPS, gorunum) {
    const carp = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3],
      a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
    let m = gorunum.slice(), yol = [];
    const yigin = [], H = [], V = [];
    const nokta = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    function ekle(a, b) {
      const dx = Math.abs(a[0] - b[0]), dy = Math.abs(a[1] - b[1]);
      if (dy < 1.5 && dx > 3) H.push({ p: (a[1] + b[1]) / 2, a: Math.min(a[0], b[0]), b: Math.max(a[0], b[0]) });
      else if (dx < 1.5 && dy > 3) V.push({ p: (a[0] + b[0]) / 2, a: Math.min(a[1], b[1]), b: Math.max(a[1], b[1]) });
    }
    function boya(cizgi, dolgu) {
      for (const s of yol) {
        if (s.kutu) {
          const [a, b] = s.kutu, w = Math.abs(a[0] - b[0]), h = Math.abs(a[1] - b[1]);
          const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2;
          if (h < 2.5) ekle([a[0], y], [b[0], y]);        // ince dolu kutu = çizgi
          else if (w < 2.5) ekle([x, a[1]], [x, b[1]]);
          else if (cizgi) { ekle(a, [b[0], a[1]]); ekle([b[0], a[1]], b); ekle(b, [a[0], b[1]]); ekle([a[0], b[1]], a); }
        } else if (cizgi) ekle(s.a, s.b);
        else if (dolgu && s.hepsi.length > 2) {
          const xs = s.hepsi.map(q => q[0]), ys = s.hepsi.map(q => q[1]);
          const a = [Math.min(...xs), Math.min(...ys)], b = [Math.max(...xs), Math.max(...ys)];
          if (b[1] - a[1] < 2.5 || b[0] - a[0] < 2.5) ekle(a, b);
        }
      }
      yol = [];
    }
    for (let i = 0; i < opList.fnArray.length; i++) {
      const f = opList.fnArray[i], g = opList.argsArray[i];
      if (f === OPS.save) yigin.push(m.slice());
      else if (f === OPS.restore || f === OPS.paintFormXObjectEnd) m = yigin.pop() || gorunum.slice();
      else if (f === OPS.transform) m = carp(m, g);
      else if (f === OPS.paintFormXObjectBegin) { yigin.push(m.slice()); if (g[0]) m = carp(m, g[0]); }
      else if (f === OPS.constructPath) {
        const c = g[1];
        let j = 0, son = null, bas = null, hepsi = [];
        for (const o of g[0]) {
          if (o === OPS.rectangle) {
            yol.push({ kutu: [nokta(c[j], c[j + 1]), nokta(c[j] + c[j + 2], c[j + 1] + c[j + 3])] });
            j += 4;
          } else if (o === OPS.moveTo) { son = bas = nokta(c[j], c[j + 1]); hepsi = [son]; j += 2; }
          else if (o === OPS.lineTo) {
            const q = nokta(c[j], c[j + 1]); hepsi.push(q);
            if (son) yol.push({ a: son, b: q, hepsi });
            son = q; j += 2;
          } else if (o === OPS.curveTo) { j += 6; son = null; }
          else if (o === OPS.curveTo2 || o === OPS.curveTo3) { j += 4; son = null; }
          else if (o === OPS.closePath && son && bas) { yol.push({ a: son, b: bas, hepsi }); son = bas; }
        }
      } else if ([OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke].includes(f)) boya(true, false);
      else if (f === OPS.fill || f === OPS.eoFill) boya(false, true);
      else if (f === OPS.endPath) yol = [];                 // sadece kırpma, çizgi değil
    }
    return { H, V };
  }

  function tablolar({ H, V }, yazilar) {
    const T = 3, hepsi = [...H.map(s => ({ ...s, h: true })), ...V.map(s => ({ ...s, h: false }))];
    const ana = hepsi.map((_, i) => i);
    const bul = i => ana[i] === i ? i : (ana[i] = bul(ana[i]));
    for (let i = 0; i < hepsi.length; i++) for (let j = i + 1; j < hepsi.length; j++) {
      const s = hepsi[i], t = hepsi[j];
      const deger = s.h === t.h
        ? Math.abs(s.p - t.p) <= T && s.a <= t.b + T && t.a <= s.b + T
        : s.p >= t.a - T && s.p <= t.b + T && t.p >= s.a - T && t.p <= s.b + T;
      if (deger) ana[bul(i)] = bul(j);
    }
    const grup = new Map();
    hepsi.forEach((s, i) => { const k = bul(i); if (!grup.has(k)) grup.set(k, []); grup.get(k).push(s); });
    const kume = d => d.sort((a, b) => a - b).reduce((r, x) => { if (!r.length || x - r[r.length - 1] > T) r.push(x); return r; }, []);
    const sonuc = [];
    for (const g of grup.values()) {
      const xs = kume(g.filter(s => !s.h).map(s => s.p)), ys = kume(g.filter(s => s.h).map(s => s.p));
      const K = xs.length - 1, S = ys.length - 1;
      if (K < 3 || S < 1) continue;
      const u = Array.from({ length: K * S }, (_, i) => i);
      const kb = i => u[i] === i ? i : (u[i] = kb(u[i]));
      const varMi = (h, p, o) => g.some(s => s.h === h && Math.abs(s.p - p) <= T && s.a - 1 <= o && s.b + 1 >= o);
      for (let r = 0; r < S; r++) for (let k = 0; k < K; k++) {
        const i = r * K + k;
        if (k + 1 < K && !varMi(false, xs[k + 1], (ys[r] + ys[r + 1]) / 2)) u[kb(i + 1)] = kb(i);
        if (r + 1 < S && !varMi(true, ys[r + 1], (xs[k] + xs[k + 1]) / 2)) u[kb(i + K)] = kb(i);
      }
      const h = new Map();
      for (let i = 0; i < K * S; i++) {
        const id = kb(i), r = Math.floor(i / K), k = i % K;
        const c = h.get(id) || { r0: r, r1: r, x0: xs[k], x1: xs[k + 1], oge: [] };
        c.r0 = Math.min(c.r0, r); c.r1 = Math.max(c.r1, r);
        c.x0 = Math.min(c.x0, xs[k]); c.x1 = Math.max(c.x1, xs[k + 1]);
        h.set(id, c);
      }
      for (const y of yazilar) {
        const k = xs.findIndex((x, i) => i < K && y.ox >= x && y.ox < xs[i + 1]);
        const r = ys.findIndex((v, i) => i < S && y.oy >= v && y.oy < ys[i + 1]);
        if (k >= 0 && r >= 0) h.get(kb(r * K + k)).oge.push(y);
      }
      const hucre = [...h.values()].map(c => {
        const satir = [];
        for (const y of c.oge.sort((a, b) => a.y - b.y)) {
          const son = satir[satir.length - 1];
          if (son && Math.abs(son[0].y - y.y) < 3) son.push(y); else satir.push([y]);
        }
        const yazi = satir.map(s => s.sort((a, b) => a.x - b.x).reduce((t, y, i) =>
          t + (i && y.x - (s[i - 1].x + s[i - 1].w) > 1 ? ' ' : '') + y.s, '').replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
        return { r0: c.r0, r1: c.r1, x0: c.x0, x1: c.x1, yazi };
      });
      sonuc.push({ satir: S, ust: ys[0], hucre });
    }
    return sonuc.sort((a, b) => a.ust - b.ust);
  }

  async function pdfOku(pdfjs, veri) {
    const belge = await pdfjs.getDocument({ data: veri, isEvalSupported: false, verbosity: 0 }).promise;
    const sonuc = { metin: '', tablolar: [], bosSayfa: [] };
    for (let n = 1; n <= belge.numPages; n++) {
      const s = await belge.getPage(n), v = s.getViewport({ scale: 1 }).transform;
      const items = (await s.getTextContent()).items;
      const yazilar = [];
      let metin = '';
      for (const i of items) {
        i.str = i.str.normalize('NFC');
        metin += i.str + (i.hasEOL ? '\n' : '');
        if (!i.str.trim()) continue;
        const [a, b, , , e, f] = i.transform, boy = Math.hypot(a, b) || 1;
        const cevir = (x, y) => [v[0] * x + v[2] * y + v[4], v[1] * x + v[3] * y + v[5]];
        const bas = cevir(e, f), son = cevir(e + a / boy * i.width, f + b / boy * i.width);
        yazilar.push({ s: i.str, x: Math.min(bas[0], son[0]), y: bas[1], w: Math.abs(son[0] - bas[0]),
          ox: (bas[0] + son[0]) / 2, oy: (bas[1] + son[1]) / 2 - 2 });
      }
      if (!yazilar.length && (await s.getOperatorList()).fnArray.includes(pdfjs.OPS.paintImageXObject)) sonuc.bosSayfa.push(n);
      sonuc.metin += metin + '\n\n';
      if (yazilar.length) sonuc.tablolar.push(...tablolar(cizgiler(await s.getOperatorList(), pdfjs.OPS, v), yazilar));
    }
    return sonuc;
  }

  /* ---------- Tablodan ve başlıklardan kadrolar ---------- */

  function sutunAdi(baslik) {
    const b = harf(baslik);
    if (!b || b.length > 70) return null;
    if (/sırano|^sıra$|^sn$/.test(b)) return 'sira';
    if (/^(pozisyon|unvan|ünvan|kadro)(u|ı)?(adı)?cinsiyet/.test(b)) return 'ad';
    if (/sayı|kontenjan|^adet|adedi|adet$/.test(b)) return 'adet';
    if (/asgari|taban|minimum|enazpuan/.test(b)) return 'taban';
    if (/cinsiyet/.test(b)) return 'cinsiyet';
    if (/derece|hizmetsınıf|^sınıf/.test(b)) return null;
    if (/^grup(u|no|adı|numarası)?$/.test(b)) return 'grup';
    if (/kod|^ilanno$/.test(b)) return 'kod';
    // Ek gelince son ünsüz yumuşar: nitelik → niteliği
    if (/nitelik|niteliğ|özelşart|aran(an|ılan|acak)şart|açıklama/.test(b)) return 'nitelik';
    if (/bölüm|program/.test(b)) return 'bolum';
    if (/öğrenim|mezuniyet|eğitimdurum|eğitimdüzey/.test(b)) return 'okul';
    if (/kpss|puantür/.test(b)) return 'kpss';
    if (/pozisyon|unvan|ünvan|kadro/.test(b)) return 'ad';
    return null;
  }

  const ZARARSIZ = /^(kadroderece|teşkilat|sırano|sn|no|istihdam|göreviyeri|görevyeri|birim|ünite|sınavtarih|sınavyeri|il$|iladı|derece|sınıf$|hizmetsınıfı|ücret|çalışmaşekli|aylıkbrüt|toplam)/;

  function tablodanKadrolar(liste) {
    const kadrolar = [];
    let sutun = null;
    const toplamlar = [];
    for (const t of liste) {
      if (Il.ilTablosuMu(t)) continue;
      let basla = 0, tabloToplam = null;
      for (let r = 0; r < Math.min(t.satir, 4); r++) {
        // Tanınmayan sütun atılmaz, şart olabilir diye "diger" olarak taşınır.
        const aday = t.hucre.filter(c => c.r0 <= r && c.r1 >= r && c.yazi && c.yazi.length < 90)
          .map(c => ({ ...c, tur: sutunAdi(c.yazi) || (ZARARSIZ.test(harf(c.yazi)) ? null : 'diger') })).filter(c => c.tur);
        const tur = new Set(aday.map(c => c.tur));
        if (tur.has('ad') && tur.has('adet') && ['okul', 'nitelik', 'bolum'].some(x => tur.has(x))) {
          sutun = aday; basla = Math.max(...aday.map(c => c.r1)) + 1;
          break;
        }
      }
      if (!sutun) continue;
      const adS = sutun.find(c => c.tur === 'adet');
      // Devam tablosu aynı sütun hizasında olmalı, başka tablo karışmasın.
      if (!t.hucre.some(c => Math.abs(c.x0 - adS.x0) < 6 && Math.abs(c.x1 - adS.x1) < 6)) continue;

      const gorulen = new Set();
      for (let r = basla; r < t.satir; r++) {
        let satir = t.hucre.filter(c => c.r0 <= r && c.r1 >= r);
        // Kontenjan hücresi birkaç satır kaplıyorsa o satırların bütün şartları bu kadronundur.
        const adH = satir.find(c => { const o = (c.x0 + c.x1) / 2; return o >= adS.x0 && o <= adS.x1; });
        if (adH && adH.r1 > adH.r0 && adH.yazi) satir = t.hucre.filter(c => c.r0 <= adH.r1 && c.r1 >= adH.r0).sort((a, b) => a.r0 - b.r0);
        const al = tur => tekil(sutun.filter(s => s.tur === tur).flatMap(s =>
          satir.filter(c => { const o = (c.x0 + c.x1) / 2; return o >= s.x0 && o <= s.x1; }))).map(c => c.yazi).filter(Boolean).join('\n');
        const h = satir.find(c => { const o = (c.x0 + c.x1) / 2; return o >= adS.x0 && o <= adS.x1; });
        const adet = h ? h.yazi.replace(/\s/g, '') : '';
        if (satir.some(c => /toplam/.test(kucuk(c.yazi)) && c.yazi.length < 30)) {
          if (/^[\d.]+$/.test(adet)) tabloToplam = Number(adet.replace(/\./g, ''));
          continue;
        }
        if (h && gorulen.has(h)) continue;
        if (h) gorulen.add(h);
        const ad = duz([al('ad'), al('grup')].filter(Boolean).join(' '));
        if (/^\d{1,3}(\.\d{3})*$|^\d+$/.test(adet) && ad) {
          const k = { ad, adet: Number(adet.replace(/\./g, '')) };
          k.diger = sutun.filter(s => s.tur === 'diger').map(s => [duz(s.yazi), duz(tekil(satir.filter(c => { const o = (c.x0 + c.x1) / 2; return o >= s.x0 && o <= s.x1; })).map(c => c.yazi).join(' '))])
            .filter(([, v]) => v && !/^[-–—]+$/.test(v));
          for (const x of ['kod', 'okul', 'bolum', 'nitelik', 'kpss', 'taban', 'cinsiyet', 'sira']) k[x] = al(x);
          kadrolar.push(k);
        } else if (!adet && r === 0 && kadrolar.length) {
          // Sayfa sonunda bölünen satırın devamı
          for (const x of ['okul', 'bolum', 'nitelik']) { const ek = al(x); if (ek) kadrolar[kadrolar.length - 1][x] += '\n' + ek; }
        }
      }
      if (tabloToplam != null) toplamlar.push(tabloToplam);
    }
    return { kadrolar, toplamlar };
  }

  function baslikBolumleri(metin) {
    const bolum = [];
    let acik = null;
    for (const ham of metin.split(/\r?\n/)) {
      const s = ham.replace(/\s+/g, ' ').trim();
      const b = s.match(/^\d{1,2}\s?[.)-]\s*(.{4,140}?)\s+(?:pozisyonu|kadrosu|unvanı|ünvanı) için\s*[;:]?$/i);
      if (b) { acik = { ad: b[1], satir: [] }; bolum.push(acik); }
      else if (/^([IVX]+\s?[-.)]|[A-ZÇ]\s?[-.]\s)\s*\S/.test(s)) acik = null;
      else if (acik && !/^(ek-?\d|\d{1,3})$/i.test(s)) acik.satir.push(s);
    }
    return bolum.map(b => ({ ad: b.ad, yazi: b.satir.join('\n').trim() }));
  }

  function genelSartlar(metin) {
    const L = metin.split(/\r?\n/).map(s => s.replace(/\s+/g, ' ').trim());
    const no = '^(?:[a-zçıivx0-9]{1,4}\\s?[.)-]\\s*)?';
    let bas = L.findIndex(s => s.length < 70 && new RegExp(no + '(?:(?:başvuracak |başvuru |adaylarda |aranacak |aranan |istenen )*)genel (?:ve özel )?(?:şartlar|koşullar)[ıi]?\\s*:?$').test(kucuk(s)));
    // Genel-özel ayrımı yapmayan ilanlarda tek başlık olur: "I- BAŞVURU ŞARTLARI"
    if (bas < 0) bas = L.findIndex(s => s.length < 70 && new RegExp(no + '(?:başvuru|başvuruda aranan|aranan|aranılan) (?:şartları|şartlar|koşulları)\\s*[:;]?$').test(kucuk(s)));
    if (bas < 0) return '';
    // Genel ve özel şartlar birlikte alınır ("1- GENEL ŞARTLAR", "2- BAŞVURU ÖZEL ŞARTLARI" alt başlıkları bölümü bitirmez;
    // aksi halde zabıta ilanlarındaki boy ve 30 yaş şartları kaybolur). Kadroya özel maddeler "kime" ile ayrılır.
    const dur = new RegExp(no + '(başvuru (yeri|şekli|tarih|esnas|zaman|süre|belge|sırasında)|istenilen belge|istenen belge|sıra no|sınav (yeri|tarihi|konuları|şekli|ve değerlendirme)|değerlendirme ve|atama)');
    let son = bas + 1;
    // Başlık virgülle ya da "olmak" ile bitmez. Madde başlık sanılırsa şartlar kaybolur.
    const sartBasligi = s => /(genel|özel|başvuru|aranan|aranılan) (şart|koşul)/.test(kucuk(s)) && !dur.test(kucuk(s));
    const baslikMi = s => s.length < 90 && !sartBasligi(s) && ((dur.test(kucuk(s)) && !/[,.]$|olmak|itibar/.test(kucuk(s))) || /^(\d{1,2}|[IVX]{1,4})\s?[.)-]\s*[A-ZÇĞİÖŞÜ ,()-]{10,}:?$/.test(s));
    while (son < L.length && !baslikMi(L[son])) son++;
    // Boş satırlar (sayfa sonu) atılır: "kadınlarda en az 1.60 ⏎⏎ metre boyunda" tek cümle kalsın.
    return L.slice(bas + 1, son).filter(s => s && !/^(ek-?\d|\d{1,3})$/i.test(s)).join('\n');
  }

  function bol(belge) {
    const { kadrolar, toplamlar } = tablodanKadrolar(belge.tablolar || []);
    const bolumler = baslikBolumleri(belge.metin), uyari = [];
    const kaynak = kadrolar.length ? 'tablo' : 'baslik';
    if (!kadrolar.length && bolumler.length > 1) for (const b of bolumler) kadrolar.push({ ad: b.ad, adet: null, ozel: b.yazi });
    else if (kadrolar.length) for (const b of bolumler) {
      const k = kadrolar.filter(x => harf(x.ad) === harf(b.ad));
      if (k.length === 1 && !k[0].ozel) k[0].ozel = b.yazi;
      else if (!k.length) uyari.push(`"${b.ad}" bölümünün şartlarını tabloda bir kadroya bağlayamadım.`);
    }
    // Tablodan gelen tek kadro da kadrodur; başlıktan bölmede en az iki gerekir.
    if (kadrolar.length < (kaynak === 'tablo' ? 1 : 2)) return null;

    const genel = genelSartlar(belge.metin);
    if (!genel) uyari.push('Genel şartlar bölümünü bulamadım. Hiçbir kadroya "uygun" demiyorum.');
    const okunan = kadrolar.reduce((t, k) => t + (k.adet || 0), 0);
    // Her tablonun kendi toplamı olabilir ya da sadece son tabloda genel toplam.
    let beklenen = toplamlar.length ? toplamlar[toplamlar.length - 1] : null;
    if (toplamlar.length > 1 && beklenen !== okunan) beklenen = toplamlar.reduce((a, b) => a + b, 0);
    if (beklenen == null) {
      const m = kucuk(belge.metin).match(/toplam(?:da)?\s*:?\s*(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:\([^)]*\)\s*)?(?:adet\s*)?(?:sözleşmeli\s*)?(?:personel|kişi|memur)/);
      if (m) beklenen = Number(m[1].replace(/\./g, ''));
    }
    if (kaynak === 'baslik') uyari.push('Tablo yok, kadroları başlıklardan böldüm. Puan ve kontenjan eksik olabilir.');
    else if (beklenen != null && beklenen !== okunan) uyari.push(`DİKKAT: ilanda ${beklenen} kişi yazıyor, ben ${okunan} kişi okudum. Eksik kadro olabilir.`);
    if (belge.bosSayfa?.length) uyari.push(`${belge.bosSayfa.join(', ')}. sayfa resim, okuyamadım.`);
    const yillar = tekil([...kucuk(belge.metin).matchAll(/(20\d\d)(?: yılı)? (?:kpss|kamu personel)|kpss ?- ?(20\d\d)/g)].map(m => +(m[1] || m[2])));
    return { kadrolar, genel, uyari, yillar, okunan, beklenen, saglama: beklenen != null && beklenen === okunan };
  }

  /* ---------- Kadro kadro karar ---------- */

  function okullar(yazi) {
    const k = kucuk(duz(yazi)), d = [];
    if (/ilkokul|ilköğretim|ortaokul/.test(k)) d.push(1);
    if (/ortaöğretim|(^|[^a-zçğıöşü])lise/.test(k)) d.push(2);
    if (/ön ?lisans/.test(k)) d.push(3);
    if (/lisans/.test(k.replace(/ön ?lisans|yüksek ?lisans/g, ''))) d.push(4);
    if (/yüksek ?lisans/.test(k)) d.push(5);
    if (/doktora/.test(k)) d.push(6);
    return d;
  }

  const DUZ_MEZUNIYET = new Set(('en az lise ve veya dengi okul okulu okullardan okullarından ortaöğretim kurumlarından kurumlarının kurumları ' +
    'mezun mezunu olmak olmak mezunları ilköğretim ilkokul ortaokul ön önlisans lisans düzeyinde öğrenim herhangi bir ' +
    // "Lisans düzeyinde eğitim veren kurumların herhangi birinden mezun olmak" = her bölüm
    'eğitim veren kurumların kurumlarından yükseköğretim birinden programlarından programından').split(' '));

  function degerlendir(B, p, bugun = new Date()) {
    const PUAN = Motor.PUAN_OKUL;
    const ortakHam = Motor.cikar(B.genel);
    const ortakTaban = tekil(ortakHam.filter(s => s.tur === 'kpss').flatMap(s => s.deger.tabanlar));
    const kok_ = ad => harf(ad.split('(')[0]).slice(0, -1);
    const adlar = tekil(B.kadrolar.map(k => kok_(k.ad))).filter(a => a.length >= 10);
    // Okul, bölüm, puan kadronun kendi satırından alınır.
    const ortak = ortakHam.filter(s => !['okul', 'bolum', 'kpss'].includes(s.tur)).map(s => {
      const c = harf(s.cumle);
      return { ...s, ...Motor.degerlendir(s, p, bugun), kime: adlar.filter(a => c.includes(a)), haric: /hari[cç]inde/.test(kucuk(s.cumle)) };
    });

    const kadrolar = B.kadrolar.map(k => {
      const R = [];
      let kpssPuan = null;   // geçmiş tabanla kıyas için
      // eksik: profilde boş olduğu için "bak" denen bilgi (okul, puan, dogum, ehliyet, boy, ikamet...)
      const ekle = (durum, not, sinif, cumle, alinabilir, eksik) => {
        if (!R.some(r => r.durum === durum && r.not === not && (sinif !== 'diger' || r.cumle === cumle)))
          R.push({ durum, not, sinif, cumle: cumle || '', alinabilir, eksik: durum === 'bak' ? eksik || null : null });
      };
      // Bazı ilanlar bölüm şartını "Öğrenim şartı" sütununa yazar.
      const okulSartli = /mezun|bölüm|program|fakülte|alanı|dalı/.test(kucuk(duz(k.okul)));
      const parca = [okulSartli ? k.okul : '', k.bolum, k.nitelik, k.ozel].filter(Boolean);
      const yazi = parca.map(duz).join(' ');
      const sartlar = parca.flatMap(x => Motor.cikar(x));

      // 1. Okul
      let D = okullar(k.okul);
      if (!D.length) D = tekil(sartlar.filter(s => s.tur === 'okul').flatMap(s => s.deger));
      // "Dört yıllık fakülte", "... mühendisliği" lisans demektir.
      if (!D.length && /fakülte|mühendisli[ğk]|(dört|(^|[^\d])4) ?(\(4\) ?)?yıllık (eğitim|fakülte|lisans|yüksek)/.test(kucuk(parca.map(duz).join(' ')))) D = [4];
      const istenen = D.map(x => Motor.OKUL[x]).join(' / '), ustYok = sartlar.some(s => s.tur === 'ustYok');
      const okulCumle = duz(k.okul) || yazi.slice(0, 250);
      if (!D.length) ekle('bak', 'Okul şartını okuyamadım.', 'diger', okulCumle);
      else if (!p.okul) ekle('bak', `${istenen} ister. Profilde okul boş.`, 'profil', okulCumle, null, 'okul');
      else if (D.includes(+p.okul)) ekle('tamam', `${istenen} ister, sende var.`, 'okul', okulCumle);
      else if (+p.okul < Math.min(...D)) ekle('yok', `${istenen} ister, sende ${Motor.OKUL[p.okul]}.`, 'okul', okulCumle);
      else if (ustYok) ekle('yok', `${istenen} ister, üst mezunları almıyor.`, 'okul', okulCumle);
      else ekle('bak', `${istenen} ister, sen daha üst mezunsun.`, 'okul', okulCumle);

      // 2. KPSS
      const kolon = kucuk(duz([k.kpss, k.okul].join(' ')));
      let turler = tekil([...kolon.matchAll(/(?:^|[^a-zçğıöşü\d]|kpss)\(?p ?-?(\d{1,3})(?!\d)|kpss ?(3|93|94)(?!\d)/g)].map(m => 'P' + (m[1] || m[2])));
      const ozelKpss = sartlar.filter(s => s.tur === 'kpss').map(s => s.deger);
      if (!turler.length) turler = tekil(ozelKpss.flatMap(x => x.turler));
      const kpssVar = turler.length || ozelKpss.length || /kpss|kamu personel(i)? seçme/.test(kucuk(B.genel));
      if (kpssVar) {
        if (!turler.length) turler = tekil(D.map(x => PUAN[x]).filter(Boolean));
        // Birden çok tür varsa adayın kendi okulunun türü geçerlidir.
        if (turler.length > 1 && turler.includes(PUAN[p.okul])) turler = [PUAN[p.okul]];
        const kt = duz(k.taban).match(/^\d{2}(?:[.,]\d+)?$/);
        // "En az 60" bazen KPSS sütununda değil taban sütununda yazar: "P3 En az 60 puan"
        const kk = kucuk(duz(k.kpss + ' ' + k.taban)).match(/(?:en az|asgari)\s*(\d{2}(?:[.,]\d+)?)/);
        let taban = kt ? [Number(kt[0].replace(',', '.'))] : kk ? [Number(kk[1].replace(',', '.'))] : tekil(ozelKpss.flatMap(x => x.tabanlar));
        if (!taban.length) taban = ortakTaban;
        const kaynak = duz([k.kpss, k.taban].join(' '));
        const satirYil = tekil([...kucuk(duz(k.kpss)).matchAll(/(?:^|[^\d.])(20\d\d)(?![\d.])/g)].map(m => +m[1]));
        const yillar = satirYil.length ? satirYil : B.yillar;
        const { secilen, sorun, hepsi } = Motor.puanSec(p, turler, yillar);
        kpssPuan = secilen || null;
        if (sorun === 'bos') ekle('bak', 'KPSS ister. Profilde puan boş.', 'profil', kaynak, null, 'puan');
        else if (sorun === 'tur') ekle('yok', `${turler.join(' / ')} puanı ister, sende ${hepsi.map(x => x.tur).join(', ')}.`, 'puan', kaynak);
        else if (sorun === 'yilBos') ekle('bak', `${yillar.join(' / ')} KPSS ister. Profilde yıl boş.`, 'profil', kaynak, null, 'puanYil');
        else if (sorun === 'yil') ekle(yillar.length === 1 ? 'yok' : 'bak', `${yillar.join(' / ')} KPSS ister.`, 'puan', kaynak);
        else if (taban.length !== 1) ekle('bak', 'Taban puanı bulamadım.', 'diger', kaynak);
        else if (secilen.puan < taban[0]) ekle('yok', `En az ${taban[0]} ister, sende ${secilen.yazi}.`, 'puan', kaynak);
        else if (!turler.length) ekle('bak', 'Puan türünü bulamadım.', 'diger', kaynak);
        else ekle('tamam', `${secilen.tur} en az ${taban[0]} ister, sende ${secilen.yazi}.`, 'puan', kaynak);
      }

      // 3. Cinsiyet: sütun, kadro adı veya özel şart
      const adEki = [...(k.ad.match(/\([^)]*\)/g) || []), (k.ad.match(/(?:^|[\s-])(KADIN|ERKEK)$/) || [])[1]].join(' ');
      const c = kucuk((k.cinsiyet || adEki) + ' ' +
        sartlar.filter(s => s.tur === 'cinsiyet' && /cinsiyet/.test(kucuk(s.cumle))).map(s => s.cumle).join(' '));
      const kadin = /kadın/.test(c), erkek = /erkek/.test(c);
      if (kadin !== erkek) {
        const ad = kadin ? 'Kadın' : 'Erkek';
        if (!p.cinsiyet) ekle('bak', `${ad} kadrosu.`, 'profil', c, null, 'cinsiyet');
        else if (p.cinsiyet === (kadin ? 'K' : 'E')) ekle('tamam', `${ad} kadrosu, uyuyor.`, 'cinsiyet', c);
        else ekle('yok', `${ad} kadrosu.`, 'cinsiyet', c);
      }

      // 4. Bölüm ve kadroya özel diğer şartlar
      for (const s of sartlar) {
        if (['okul', 'kpss', 'ustYok'].includes(s.tur) || (s.tur === 'cinsiyet' && /cinsiyet/.test(kucuk(s.cumle)))) continue;
        const r = Motor.degerlendir(s, p, bugun);
        let sinif = 'diger';
        if (s.tur === 'bolum') {
          const t = kucuk(s.cumle);
          // "Lisans düzeyinde eğitim veren bölümlerinden" = her bölüm
          if (/düzeyinde eğitim veren (bölümleri|programları)/.test(t) || /\(lise ve dengi( okul)?\)/.test(t) && !/alan|dal|meslek/.test(t)) {
            ekle('tamam', 'Bölüm fark etmiyor.', 'bolum', s.cumle); continue;
          }
          if (r.durum === 'bak') {
            if (!p.bolum) { sinif = 'profil'; r.eksik = +p.okul >= 3 ? 'bolum' : null }
            else if (!/ilgili (bölüm|alan)|sertifika|herhangi|hariç/.test(t) && !t.includes(Motor.bolumAd(p.bolum))) {
              ekle('bak', 'Senin bölümün bu kadroda geçmiyor.', 'bolum', s.cumle); continue;
            }
          }
        }
        ekle(r.durum, r.not, sinif, s.cumle, r.alinabilir, r.eksik);
      }
      // Mezuniyet cümlesinde düz okul adından başka kelime varsa o bir alan şartıdır.
      for (const s of sartlar.filter(x => x.tur === 'okul')) {
        if (sartlar.some(x => x.tur === 'bolum' && x.cumle === s.cumle)) continue;
        const fazla = kucuk(s.cumle).replace(/[^a-zçğıöşü]+/g, ' ').trim().split(' ').filter(w => w.length > 1 && !DUZ_MEZUNIYET.has(w));
        if (!fazla.length) continue;
        if (!p.bolum) ekle('bak', 'Alan veya bölüm şartı olabilir.', 'profil', s.cumle, null, +p.okul >= 3 ? 'bolum' : null);
        else ekle('bak', 'Alan şartı olabilir, oku.', 'diger', s.cumle);
      }
      if (k.okul && !okulSartli) {
        const fazla = kucuk(duz(k.okul)).replace(/kpss\s?p?\s?-?\d*|\(?p\d+\)?/g, ' ').replace(/[^a-zçğıöşü]+/g, ' ').trim().split(' ')
          .filter(w => w.length > 1 && !DUZ_MEZUNIYET.has(w) && !['yüksek', 'doktora', 'mezuniyeti', 'düzeyi'].includes(w));
        if (fazla.length) ekle('bak', 'Öğrenim sütununda ek şart olabilir, oku.', 'diger', duz(k.okul));
      }
      for (const [baslik, deger] of k.diger || []) ekle('bak', `"${baslik}" sütununu oku: ${deger.slice(0, 60)}`, 'diger', deger);
      // Motorun hiç tanımadığı özel madde sessizce geçilmez.
      for (const x of parca) {
        for (const ham of x.split(/\n(?=\s*(?:[-•]|\d{1,2}\s?\)|[a-zçğ]\))\s*\S)/)) {
          const m = duz(ham), n = harf(m);
          if (n.length < 12 || /istihdam edil(ecek|ebilecek)|çalıştırılacaktır\.?$/.test(kucuk(m))) continue;
          if (sartlar.some(s => n.includes(harf(s.cumle)) || harf(s.cumle).includes(n))) continue;
          ekle('bak', 'Kadroya özel madde, oku.', 'diger', m);
        }
      }

      // 5. Bu kadroyu bağlayan ortak şartlar
      const benim = kok_(k.ad);
      for (const s of ortak) {
        if (s.kime.length && s.kime.includes(benim) === s.haric) continue;
        if (s.durum === 'yok') ekle('yok', s.not, 'ortak', s.cumle, s.alinabilir);
        else if (s.kime.length) ekle(s.durum, s.not, 'diger', s.cumle, null, s.eksik);
        // İkamet sadece profilde il boşsa (doldurulsun diye) kadroya yansır; tanınmayan madde "ortak oku"da kalır.
        else if (s.durum === 'bak' && s.tur !== 'bilinmeyen' && !(s.tur === 'ikamet' && !s.eksik) && !(s.tur === 'genel' && p.genel)) ekle('bak', s.not, 'profil', s.cumle, null, s.eksik);
      }

      const yok = R.filter(r => r.durum === 'yok'), bak = R.filter(r => r.durum === 'bak');
      let grup = 'uygun';
      if (yok.some(r => !r.alinabilir)) grup = 'uymuyor';
      else if (bak.some(r => r.sinif === 'bolum')) grup = 'bolum';
      else if (yok.length) grup = 'belge';
      else if (bak.length || !B.genel) grup = 'bak';
      const neden = grup === 'bolum' ? bak.filter(r => r.sinif === 'bolum') : yok.length ? yok : bak;
      return { ...k, kpssPuan, grup, sartlar: R, neden: tekil(neden.map(r => r.not)).slice(0, 2).join(' ') };
    });

    // Genel şartlarda tanınmayan madde de "bir kez oku" listesine girer.
    for (const ham of B.genel.split(/\n(?=\s*(?:[-•]|\d{1,2}(?:\.\d{1,2})*\s?[.)-](?=\s)|[a-zçğ]\))\s*\S)/)) {
      const cumle = duz(ham), n = harf(cumle);
      if (n.length < 12 || ortakHam.some(s => n.includes(harf(s.cumle)) || harf(s.cumle).includes(n))) continue;
      ortak.push({ tur: 'bilinmeyen', cumle, durum: 'bak', not: 'Ortak madde, oku.', kime: [] });
    }
    const gor = new Set();
    const ortakOku = ortak.filter(s => !s.kime.length && s.durum === 'bak' && !gor.has(s.cumle) && gor.add(s.cumle));
    return { kadrolar, ortakOku };
  }

  // Kayıt listesinde görünen ad: kurum + alımın konusu
  function ilanAdi(metin) {
    const L = String(metin).split('\n').map(s => s.trim()).filter(s => s.length > 5 && !/^ek ?-?\d/i.test(s)).slice(0, 8);
    // "Üniversitesi" küçük harfle yazılınca İ/i farkı kaçırmasın: büyük harfe çevirip bakılır.
    const B_ = s => s.toLocaleUpperCase('tr-TR');
    const kurum = L.find(s => /BAKANLI|BELEDİYE|ÜNİVERSİTE|BAŞKANLI|KURUMU|AJANSI|MÜDÜRLÜĞ|İDARESİ|KOMUTANLI/.test(B_(s))) || L[0] || 'İlan';
    // Konu başlığı birkaç satıra bölünmüş olabilir: büyük harfli ardışık satırlar birleştirilir.
    let konu = '';
    const ki = L.findIndex(s => s !== kurum && /^20\d\d YILI|ALIM|İLANI|SINAVI|TEMİN/.test(B_(s)));
    if (ki >= 0) {
      const tumu = String(metin).split('\n').map(s => s.trim()).filter(Boolean), bas = tumu.indexOf(L[ki]);
      const parca = [L[ki]];
      for (let j = bas + 1; j < bas + 4 && j < tumu.length; j++) {
        const s = tumu[j];
        if (s !== B_(s) || /^\d|^[A-ZÇĞİÖŞÜ]\)/.test(s) || s.length > 90) break;   // küçük harfli metin başladı
        parca.push(s);
        if (/İLANI|DUYURUSU|ALACAK$/.test(s)) break;
      }
      konu = parca.join(' ').replace(/\s+/g, ' ');
    }
    return (kurum.replace(/\s*['’]\s*(ndan|nden)?\s*:?\s*$/i, '').replace(/(ndan|nden|ndan:|nden:|:)\s*$/i, '').replace(/(ndan|nden):?$/i, '') + ': ' + konu).replace(/^T\.C\.\s*/, '').trim().slice(0, 170);
  }

  const api = { pdfOku, bol, degerlendir, ilanAdi, genelSartlar };
  if (typeof module !== 'undefined') module.exports = api; else kok.Bolucu = api;
})(this);
