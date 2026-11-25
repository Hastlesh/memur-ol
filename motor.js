/* Şartım Tamam - şart çıkarma ve karşılaştırma motoru.
   Temel kural: emin değilse asla "tamam" deme, "bak" de. */
(function (kok) {
  'use strict';

  const kucuk = s => String(s || '').normalize('NFC').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
  const sayi = s => Number(String(s).replace(',', '.'));
  const tekil = a => [...new Set(a)];
  const OKUL = { 1: 'İlköğretim', 2: 'Lise', 3: 'Ön lisans', 4: 'Lisans', 5: 'Yüksek lisans', 6: 'Doktora' };

  const BELGELER = {
    'SRC': /(^|[^a-zçğıöşü])src\s?-?\d?([^a-zçğıöşü]|$)/,
    'Psikoteknik': /psikoteknik/,
    'Özel güvenlik kimliği': /özel güvenlik (görevlisi )?(kimlik|sertifika)|özel güvenlik görevlisi kimli/,
    'Bilgisayar işletmenliği': /bilgisayar işletmen/,
    'Hijyen eğitimi': /hijyen (eğitim|belge|sertifika)/,
    'Yabancı dil (YDS)': /(^|[^a-zçğıöşü])(yds|e-yds|yökdil)([^a-zçğıöşü]|$)/,
    'Ustalık belgesi': /ustalık belge/,
    'Aşçılık belgesi': /aşçılık (belge|sertifika)/
  };
  const EVRAK = {
    'Kimlik': /kimlik (kartı|belgesi|fotokopi)|nüfus cüzdan/,
    'Diploma / mezuniyet belgesi': /diploma|mezuniyet belge/,
    'KPSS sonuç belgesi': /kpss.{0,40}sonuç belge/,
    'Fotoğraf': /fotoğraf/,
    'Adli sicil kaydı': /adli sicil|adlî sicil/,
    'Askerlik durum belgesi': /askerlik (durum|terhis).{0,15}belge/,
    'Sağlık raporu': /sağlık (kurulu )?rapor/,
    'SGK hizmet dökümü': /hizmet (dökümü|belgesi)/,
    'Öz geçmiş': /öz ?geçmiş/,
    'Başvuru formu': /başvuru formu/
  };

  // PDF'de bölünen satırları birleştirir, sonra cümlelere ayırır.
  function cumleler(metin) {
    metin = String(metin).normalize('NFC');
    const madde = /^([-•●▪*]|\d{1,2}\s?[.)-](?!\d)|[a-zçğıöşü]\s?[.)])\s*/i;
    const parca = [];
    let son = '';
    for (const ham of String(metin).split(/\r?\n/)) {
      const s = ham.replace(/\s+/g, ' ').trim();
      if (!s) { if (son) parca.push(son); son = ''; continue; }
      if (son && (madde.test(s) || /[.;:!?]$/.test(son))) { parca.push(son); son = ''; }
      // Satır sonunda bölünen kelime: "yük-" + "sekokulu"
      if (/[a-zçğıöşü]-$/.test(son) && /^[a-zçğıöşü]/.test(s)) son = son.slice(0, -1) + s;
      else son += (son ? ' ' : '') + s;
    }
    if (son) parca.push(son);
    return parca
      .flatMap(p => p.split(/(?<=[^\d\s.]{3}[.;])\s+(?=[A-ZÇĞİÖŞÜ])/))
      .filter(s => s.length > 3);
  }

  function cikar(metin) {
    const sartlar = [];
    for (const cumle of cumleler(metin)) {
      const k = kucuk(cumle);
      let bulundu = false;
      const ekle = (tur, deger) => { sartlar.push({ tur, deger, cumle }); bulundu = true; };
      let m;

      if (/tercih (sebebi|nedeni)|tercihen/.test(k)) { ekle('tercih'); continue; }

      const ustYok = /(üst|üzeri).{0,40}(mezun olmamak|mezunu olmamak)/.test(k);
      if (ustYok) ekle('ustYok');
      if (!ustYok && /mezun|öğrenim|diploma(sı|sına) sahip/.test(k) && !/fotokopi|sonuç belge/.test(k)) {
        const d = [];
        if (/ilkokul|ilköğretim|ortaokul/.test(k)) d.push(1);
        if (/ortaöğretim|(^|[^a-zçğıöşü])lise/.test(k)) d.push(2);
        if (/ön ?lisans|meslek yüksekokul/.test(k)) d.push(3);
        if (/lisans/.test(k.replace(/ön ?lisans|yüksek lisans/g, ''))) d.push(4);
        if (/yüksek lisans/.test(k)) d.push(5);
        if (/doktora/.test(k)) d.push(6);
        if (d.length) ekle('okul', d);
        if (/bölüm|program|fakülte|(^| )alan(ı|ları|ından|larından|ında)|(^| )dal(ı|ları|ından|larından)([^a-zçğıöşü]|$)/.test(k)) ekle('bolum', k);
      }

      if (/kpss|kamu personel(i)? seçme sınav/.test(k)) {
        const turler = tekil([...k.replace(/kpss ?(3|93|94)(?!\d)/g, 'kpssp$1').matchAll(/(?:^|kpss|[^a-zçğıöşü\d])\(?p\s?-?\(?(\d{1,3})(?!\d)/g)].map(x => 'P' + +x[1]));   // "KPSS P03" = P3
        const tabanlar = tekil([
          ...k.matchAll(/(?:en az|asgari|minimum)\s*(?:[a-zçğıöşü]+\s*(?=\())?\(?(\d{2}(?:[.,]\d+)?)(?![\d.,]*\s*(?:yıl|yaş|gün|kişi))/g),
          ...k.matchAll(/(\d{2}(?:[.,]\d+)?)\s*(?:\([^)]{1,15}\)\s*)?(?:puan )?ve (?:üzeri|üstü|daha yüksek)/g)
        ].map(x => sayi(x[1])).filter(x => x >= 40 && x <= 100));
        const yillar = tekil([...k.matchAll(/(20\d\d)[- ]*(?:yılı |yıllarında |yılında )?(?:kpss|kamu personel)/g)].map(x => +x[1]));
        if (turler.length || tabanlar.length) ekle('kpss', { turler, tabanlar, yillar });
      }

      const AY = 'ocak şubat mart nisan mayıs haziran temmuz ağustos eylül ekim kasım aralık'.split(' ');
      const dg = k.match(new RegExp('(\\d{1,2})(?:[./](\\d{1,2})[./]| (' + AY.join('|') + ') )((?:19|20)\\d\\d)\\s*(?:tarihi(?:nde)? )?(?:ve|veya) (?:daha )?sonra\\S*(?: tarihlerde)? doğ'));
      if (dg) ekle('dogum', dg[4] + '-' + String(dg[2] || AY.indexOf(dg[3]) + 1).padStart(2, '0') + '-' + dg[1].padStart(2, '0'));
      // Açık doğum tarihi varsa yaş hesabından daha kesindir.
      if (!dg && (m = k.match(/(\d{2})\s*(?:\([^)]+\)\s*)?yaşın[ıi] (?:doldurmamış|bitirmemiş|tamamlamamış|aşmamış|geçmemiş)/))) ekle('yasUst', +m[1]);
      if ((m = k.match(/(\d{2})\s*(?:\([^)]+\)\s*)?yaşın[ıi] (?:doldurmuş|tamamlamış|bitirmiş)/))) ekle('yasAlt', +m[1]);

      if (/sürücü (belge|ehliyet)|ehliyet(i|ine|e) sahip/.test(k)) {
        const sinif = [...k.matchAll(/(?:^|[\s("“'])(a1|a2|a|b|be|c1|ce|c|d1|de|d)["”')]*(?=\s*(?:,|\/|veya|ve |sınıf))/g)].map(x => x[1].toUpperCase());
        ekle('ehliyet', tekil(sinif));
      }

      if (/askerli(k|ğ)/.test(k) && /ilişi[ğk]|yapmış|muaf|tecil|terhis/.test(k)) ekle('askerlik');

      if ((m = k.match(/(?<![\d.,])([12])[.,](\d\d)(?![.,]?\d)\s*(?:m|metre|cm)?.{0,30}boy|boy.{0,40}?([12])[.,](\d\d)/))) ekle('boy', +((m[1] || m[3]) + (m[2] || m[4])));
      else if ((m = k.match(/boy.{0,40}?(1[4-9]\d)\s*(?:cm|santim)|(1[4-9]\d)\s*(?:cm|santim).{0,50}boy/))) ekle('boy', +(m[1] || m[2]));

      const kadin = /kadın (aday|personel|olmak)|bayan aday/.test(k);
      const erkek = /erkek (aday|personel|olmak)/.test(k) && !/askerli/.test(k);
      if (kadin || erkek) ekle('cinsiyet', kadin && erkek ? '' : kadin ? 'K' : 'E');

      if ((m = k.match(/en az (\d{1,2})\s*(?:\([^)]+\)\s*)?yıl.{0,80}(deneyim|tecrübe|çalışmış|hizmet)/))) ekle('deneyim', +m[1]);

      for (const [ad, desen] of Object.entries(BELGELER)) if (desen.test(k)) ekle('belge', ad);

      if (/ikamet (etmek|ediyor|şartı)|ikametgah[ıi].{0,30}olmak/.test(k)) ekle('ikamet');

      // Üniversitede kayıtlı öğrenci olmamak; emekli aylığı almamak
      if (/öğrenci(si)? (olmamak|olmaması|bulunmamak)|öğrenim(ine|e)? devam etmiyor olmak|örgün (öğretim|eğitim).{0,60}kayıtlı (olmamak|bulunmamak)|öğrencisi olarak kaydı (bulunmamak|olmamak)/.test(k)) ekle('ogrenci');
      if (/emekli(lik)? (aylığı|maaşı)(nı)? (almamak|almıyor olmak)|emekli(lik)? aylığı bağlanmamış|emekliliğe hak kazanmamış/.test(k)) ekle('emekli');
      // 4/B ilanları: halen sözleşmeli çalışmıyor olmak; sözleşmesi feshedildiyse 1 yıl bekleme
      if (/4\/b sözleşmeli personel (pozisyonunda|olarak) çalışmıyor olmak|pozisyonunda halen görev yapıyor olmamak/.test(k)) ekle('sozlesmeli');
      else if (/sözleşmesi feshedilen veya sözleşmesini yenilemeyen.{0,260}bekleme süresini/.test(k)) ekle('fesih');

      if (/türk vatandaş|türkiye cumhuriyeti vatandaş|kamu haklarından|mahk[uûü]m olma|akıl hastalığı|48 ?(['’]?(inci|nci)|\.|\/a)? ?madde|sağlık (sorunu|problemi) (bulunma|olma)|ihraç edilmemiş|görevinden çıkar[ıt]lmamış/.test(k)) ekle('genel');

      // "48 inci madde şartlarının yanı sıra ... boy ... kilo" gibi cümlede asıl şartlar ayrıca değerlendirildiyse
      // mevzuat atfı ("genel") ayrıca "uzun madde, oku" diye işaretlenmez.
      const buCumle = sartlar.filter(x => x.cumle === cumle);
      if (buCumle.some(x => x.tur === 'genel') && buCumle.some(x => ['boy', 'yasUst', 'yasAlt', 'dogum', 'ehliyet', 'askerlik', 'cinsiyet'].includes(x.tur)) &&
          !/akıl hastalığı|mahk[uûü]m|kamu hakları/.test(k)) sartlar.splice(sartlar.findIndex(x => x.cumle === cumle && x.tur === 'genel'), 1);

      // Tanımadığı şartı yutmaz, kullanıcıya gösterir.
      if (!bulundu && cumle.length < 1200 && !/yükle(me|n)|ulaştırma|güncelleme/.test(k) &&
          /(olmak|olmamak|bulunmamak|bulunmak|almamak|taşımak|bilmek|şarttır|şartı aranır|gerekmektedir|gerekir|zorunludur|sahip ol\S*)[\s.;,:)]*$/.test(k)) ekle('bilinmeyen');
    }
    return sartlar;
  }

  // Farklı okul, puan türü veya taban varsa ilanda birden çok kadro vardır.
  function cokluMu(sartlar) {
    const kpss = sartlar.filter(s => s.tur === 'kpss').map(s => s.deger);
    const okul = sartlar.filter(s => s.tur === 'okul').map(s => s.deger.join());
    return tekil(okul).length > 1 ||
      tekil(kpss.flatMap(x => x.turler)).length > 1 ||
      tekil(kpss.flatMap(x => x.tabanlar)).length > 1;
  }

  const PUAN_OKUL = { 2: 'P94', 3: 'P93', 4: 'P3', 5: 'P3', 6: 'P3' };
  // "Kamu Yönetimi (Açıköğretim)" ilanda "Kamu Yönetimi" olarak geçer: öğretim şekli eki karşılaştırmada atılır.
  const bolumAd = s => kucuk(s).replace(/\s*\((açık ?öğretim|uzaktan öğretim|uzaktan eğitim|ikinci öğretim|io|iö|aöf)\)/g, '').trim();

  // Yeni profil: p.puanlar listesi. Eski kayıtlardaki tek puan da okunur.
  function puanListe(p) {
    const ham = Array.isArray(p.puanlar) ? p.puanlar : [{ tur: p.puanTur, puan: p.puan, yil: p.puanYil }];
    return ham.filter(x => x && x.tur && String(x.puan == null ? '' : x.puan).trim())
      .map(x => ({ tur: x.tur, yazi: String(x.puan).trim(), puan: sayi(String(x.puan).trim()), yil: x.yil ? +x.yil : null }))
      .filter(x => x.puan > 0 && x.puan <= 100);
  }

  // Şarta giren puanların en yükseğini seçer. Başka yılın ya da türün puanını sayamaz.
  function puanSec(p, turler, yillar) {
    const hepsi = puanListe(p), enIyi = a => a.reduce((x, y) => y.puan > x.puan ? y : x);
    if (!hepsi.length) return { sorun: 'bos', hepsi };
    const tur = turler.length ? hepsi.filter(x => turler.includes(x.tur)) : hepsi;
    if (!tur.length) return { sorun: 'tur', hepsi };
    if (!yillar.length) return { secilen: enIyi(tur), hepsi };
    const yil = tur.filter(x => yillar.includes(x.yil));
    if (yil.length) return { secilen: enIyi(yil), hepsi };
    return { sorun: tur.some(x => !x.yil) ? 'yilBos' : 'yil', hepsi };
  }

  function yas(dogum, bugun) {
    const [y, a, g] = dogum.split('-').map(Number);
    const once = bugun.getMonth() + 1 < a || (bugun.getMonth() + 1 === a && bugun.getDate() < g);
    return bugun.getFullYear() - y - (once ? 1 : 0);
  }

  function degerlendir(s, p, bugun) {
    const d = s.deger;
    // eksik: profilde hangi bilgi boş olduğu için "bak" dendiği (uygulama "şunu doldur" der)
    const r = (durum, not, alinabilir, eksik) => ({ durum, not, alinabilir, eksik });
    switch (s.tur) {
      case 'okul': {
        const istenen = d.map(x => OKUL[x]).join(' / ');
        if (!p.okul) return r('bak', `${istenen} isteniyor. Profilde okul boş.`, null, 'okul');
        if (d.includes(+p.okul)) return r('tamam', `${istenen} isteniyor, sende var.`);
        return +p.okul > Math.max(...d)
          ? r('bak', `${istenen} isteniyor. Daha üst mezuniyet her ilanda kabul edilmez.`)
          : r('yok', `${istenen} isteniyor, sende ${OKUL[p.okul]}.`);
      }
      case 'bolum': {
        const b = bolumAd(p.bolum);
        // Sadece gerçekten bölüm şartı olmayan ifadeler: "herhangi bir bölümden", "bölüm ayrımı gözetilmeksizin".
        // "dallarının herhangi birinden" ya da "herhangi bir ortaöğretim kurumundan mezun olup 3 yıl çalışmış" bölüm serbestliği değildir.
        if ((/herhangi bir (lisans |ön ?lisans |yükseköğretim )?(bölüm|program|alan|fakülte)(ün|ünden|ından|dan|den)?([^a-zçğıöşü]|$)/.test(d) ||
             /(bölüm|alan|mezuniyet) ayrımı(na)? (gözetilmeksizin|aranmaksızın|yapılmaksızın|bakılmaksızın)/.test(d)) && !/hariç|dışında|mezun olup/.test(d)) return r('tamam', 'Bölüm fark etmiyor.');
        if (b.length > 2 && !/hariç|dışında/.test(d)) {
          // Tam ad aranır: "işletme", "turizm işletmeciliği" içinde eşleşmesin.
          const guvenli = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (new RegExp(`(^|[,:;("/]\\s*|veya |^(?:ön ?)?lisans |^lise |ön ?lisans |kurumlarının |üniversitelerin |eğitim veren )${guvenli}(?=\\s*([,;)"/.]|veya|bölüm|program|$))`).test(d)) return r('tamam', 'Bölümün ilanda geçiyor.');
        }
        // Lise mezununa bölüm sorulmadığı için "bölümünü doldur" denmez.
        return r('bak', 'Bölüm veya program şartı var, listeyi kontrol et.', null, b.length > 2 || +p.okul < 3 ? null : 'bolum');
      }
      case 'kpss': {
        // Cümlede birden çok tür varsa adayın kendi okulunun türü geçerlidir.
        const turler = d.turler.length > 1 && d.turler.includes(PUAN_OKUL[p.okul]) ? [PUAN_OKUL[p.okul]] : d.turler;
        const { secilen, sorun, hepsi } = puanSec(p, turler, d.yillar);
        if (sorun === 'bos') return r('bak', 'KPSS şartı var. Profilde puan boş.', null, 'puan');
        if (sorun === 'tur') return r('bak', `${turler.join(' / ')} puanı isteniyor, sendeki ${hepsi.map(x => x.tur).join(', ')}.`);
        if (sorun) return r('bak', `${d.yillar.join(' / ')} KPSS isteniyor, sınav yılını kontrol et.`, null, sorun === 'yilBos' ? 'puanYil' : null);
        if (d.tabanlar.length !== 1) return r('bak', 'Taban puanı ilandan kontrol et.');
        if (secilen.puan < d.tabanlar[0]) return r('yok', `En az ${d.tabanlar[0]} isteniyor, sende ${secilen.yazi}.`);
        if (!turler.length) return r('bak', 'Puanın yetiyor ama puan türü bu cümlede yazmıyor.');
        return r('tamam', `En az ${d.tabanlar[0]} isteniyor, sende ${secilen.yazi}.`);
      }
      case 'yasUst': case 'yasAlt': {
        const yon = s.tur === 'yasUst' ? `${d} yaşını doldurmamış olmalı.` : `${d} yaşını doldurmuş olmalı.`;
        if (!p.dogum) return r('bak', `${yon} Profilde doğum tarihi boş.`, null, 'dogum');
        const y = yas(p.dogum, bugun);
        // Yaş bazen sınav tarihinde aranır (tarih belli değil): son günden 6 ay sonra da sınırın altındaysa sorun yok.
        if (s.tur === 'yasUst') {
          if (y >= d) return r('yok', `${yon} Sen ${y} yaşındasın.`);
          if (yas(p.dogum, new Date(+bugun + 183 * 864e5)) >= d) return r('bak', `${yon} Sınırdasın (${y} yaşındasın), ilandaki tarihe bak.`);
          return r('tamam', `${yon} Sen ${y} yaşındasın.`);
        }
        if (y >= d) return r('tamam', `${yon} Sen ${y} yaşındasın.`);
        return y === d - 1 ? r('bak', `${yon} Sınırdasın, ilandaki tarihe bak.`) : r('yok', `${yon} Sen ${y} yaşındasın.`);
      }
      case 'dogum':
        if (!p.dogum) return r('bak', 'Doğum tarihi sınırı var.', null, 'dogum');
        return r(p.dogum >= d ? 'tamam' : 'yok', `${d.split('-').reverse().join('.')} ve sonrası doğumlular.`);
      case 'ehliyet': {
        // Ehliyet sorusu hiç cevaplanmadıysa (undefined) "yok" denmez, sorulur.
        if (p.ehliyet == null) return r('bak', `${d.length ? d.join(' / ') + ' e' : 'E'}hliyet isteniyor. Profilde ehliyet bilgin yok.`, null, 'ehliyet');
        if (!d.length) return r('bak', 'Ehliyet isteniyor, sınıfını ilandan kontrol et.');
        const var_ = kucuk(p.ehliyet).toUpperCase().split(/[\s,\/]+/);
        if (d.some(x => var_.includes(x))) return r(d.length > 1 ? 'bak' : 'tamam', `${d.join(' / ')} ehliyet isteniyor.`);
        return r('yok', `${d.join(' / ')} ehliyet isteniyor, sende yok.`, `${d.join(' / ')} ehliyet`);
      }
      case 'ustYok':
        return r('bak', 'Daha üst bir okuldan mezun olanlar başvuramıyor.');
      case 'askerlik':
        if (p.cinsiyet === 'K') return r('tamam', 'Askerlik şartı seni bağlamıyor.');
        if (['yapti', 'muaf', 'tecilli'].includes(p.asker)) return r('tamam', 'Askerlikte ilişiğin yok.');
        return r('bak', 'Askerlik şartı var.', null, !p.cinsiyet ? 'cinsiyet' : !p.asker ? 'asker' : null);
      case 'boy': {
        const k = kucuk(s.cumle);
        let esik = d;
        // "erkeklerde en az 1.67 metre, kadınlarda en az 1.60 metre"
        const e = k.match(/erkek\S*\s*(?:için\s*)?(?:en az\s*)?([12])[.,](\d\d)/), kd = k.match(/kadın\S*\s*(?:için\s*)?(?:en az\s*)?([12])[.,](\d\d)/);
        if (e || kd) {
          if (!p.cinsiyet) return r('bak', 'Boy şartı cinsiyete göre değişiyor.', null, 'cinsiyet');
          const m = p.cinsiyet === 'E' ? e : kd;
          if (!m) return r('bak', 'Boy şartı cinsiyete göre değişiyor, ilandan bak.');
          esik = +(m[1] + m[2]);
        }
        if (!p.boy) return r('bak', `En az ${esik} cm boy isteniyor.`, null, 'boy');
        if (+p.boy < esik) return r('yok', `En az ${esik} cm isteniyor, sende ${p.boy}.`);
        if (/kilo/.test(k)) {
          // "boyun 1 metreden fazla olan kısmı ile kilosu arasında (+,-) 10 kg'dan fazla fark olmamak"
          const f = k.match(/(\d{1,2})\s*(?:kg|kilo)\S*\s*fazla fark/);
          if (!f || !/1 metreden fazla olan kısmı/.test(k)) return r('bak', `Boyun yetiyor (en az ${esik} cm). Boy-kilo şartını ilandan kontrol et.`);
          if (!p.kilo) return r('bak', `Boyun yetiyor. Boy-kilo uyumu isteniyor (en fazla ${f[1]} kg fark).`, null, 'kilo');
          const fark = Math.abs(+p.kilo - (+p.boy - 100));
          if (fark <= +f[1]) return r('tamam', `Boy ${p.boy} cm, kilo ${p.kilo}: boy ve boy-kilo şartı tutuyor.`);
          // Sınırı 1-2 kg aşan elenmez: kilo kısa sürede değişir ve ölçüm kurumda yapılır → kontrol et
          const asim = fark - +f[1];
          if (asim <= 2) return r('bak', `Boy-kilo farkın ${fark} kg, en fazla ${f[1]} olmalı: ${asim} kg fazla. Ölçüm kurumda yapılır; başvuruya kadar ${asim} kg ${+p.kilo > +p.boy - 100 ? 'vermen' : 'alman'} yeterli.`);
          return r('yok', `Boy-kilo farkın ${fark} kg, en fazla ${f[1]} olmalı.`);
        }
        return r('tamam', `En az ${esik} cm isteniyor, sende ${p.boy}.`);
      }
      case 'cinsiyet':
        if (!d || !p.cinsiyet) return r('bak', 'Cinsiyete göre ayrım var.', null, d && !p.cinsiyet ? 'cinsiyet' : null);
        return p.cinsiyet === d ? r('tamam', 'Cinsiyet şartı uyuyor.') : r('bak', 'Bu madde diğer cinsiyet için olabilir.');
      case 'deneyim':
        if (p.deneyim === '' || p.deneyim == null) return r('bak', `${d} yıl deneyim isteniyor.`, null, 'deneyim');
        return +p.deneyim >= d ? r('bak', `${d} yıl isteniyor. Süren yetiyor, alanı kontrol et.`) : r('yok', `${d} yıl deneyim isteniyor, sende ${p.deneyim}.`);
      case 'belge':
        // Belge sorusu hiç cevaplanmadıysa sorulur.
        if (p.belgeSoruldu === false) return r('bak', `${d} isteniyor. Profilde belgelerin işaretli değil.`, null, 'belge');
        if ((p.belgeler || []).includes(d) && /en az \d/.test(kucuk(s.cumle))) return r('bak', `${d} sende var. İstenen puanı veya süreyi kontrol et.`);
        if ((p.belgeler || []).includes(d)) return r('tamam', `${d} sende var.`);
        return /veya|yahut/.test(kucuk(s.cumle)) ? r('bak', `${d} seçeneklerden biri olabilir.`) : r('yok', `${d} isteniyor, sende yok.`, d);
      case 'genel': {
        // Sadece "657 sayılı Kanunun 40 ve 48 inci maddelerindeki şartlar" atfı uzun olsa da genel şarttır.
        const k = kucuk(s.cumle);
        const sinir = /akıl hastalığı bulunmamak/.test(k) ? 260 : /48 ?(['’]?(inci|nci)|\.|\/a)? ?madde/.test(k) && !/(olmamak|bulunmamak|olmak)[^.]{0,200}(olmamak|bulunmamak|olmak)[^.]{0,200}(olmamak|bulunmamak|olmak)/.test(k) ? 360 : 170;
        if (s.cumle.length > sinir) return r('bak', 'Uzun mevzuat maddesi, bir kez oku.');
        return p.genel ? r('tamam', 'Genel memuriyet şartı (senin beyanın).') : r('bak', 'Genel memuriyet şartı.');
      }
      case 'ikamet': {
        if (!p.ikamet) return r('bak', 'İkamet şartı var. Profilde yaşadığın il boş.', null, 'ikamet');
        const IL = typeof Il !== 'undefined' ? Il : (typeof require === 'function' ? require('./il.js') : null);
        const k = kucuk(s.cumle), benim = kucuk(p.ikamet);
        const anilan = IL ? IL.ILLER.filter(il => new RegExp(`(^|[^a-zçğıöşü])${kucuk(il)}([^a-zçğıöşü]|$)`).test(k)) : [];
        if (anilan.some(il => kucuk(il) === benim)) return r('bak', `İkamet şartı ${p.ikamet} için; ilçe veya belediye sınırı şartını kontrol et.`);
        if (anilan.length) return r('yok', `${anilan.join(', ')} ikametgâhı isteniyor, sen ${p.ikamet} ilinde yaşıyorsun.`);
        return r('bak', 'İkamet şartı var, yerini ilandan kontrol et.');
      }
      case 'ogrenci':
        if (!p.ogrenci) return r('bak', 'Öğrenci olmama şartı var.', null, 'ogrenci');
        return p.ogrenci === 'degil' ? r('tamam', 'Öğrenci olmama şartı: öğrenci değilsin.') : r('yok', 'Kayıtlı öğrenciler başvuramıyor.');
      case 'sozlesmeli':
        if (!p.sozlesmeli) return r('bak', 'Şu an 4/B sözleşmeli çalışmıyor olma şartı var.', null, 'sozlesmeli');
        return p.sozlesmeli === 'hayir' ? r('tamam', 'Şu an 4/B sözleşmeli çalışmıyorsun.') : r('yok', 'Halen 4/B sözleşmeli çalışanlar başvuramıyor.');
      case 'fesih':
        if (!p.fesih) return r('bak', 'Sözleşmesi feshedilenler için 1 yıl bekleme şartı var.', null, 'fesih');
        return p.fesih === 'hayir' ? r('tamam', 'Son 1 yılda sözleşmen feshedilmedi.') : r('bak', 'Sözleşmen feshedildiyse 1 yıllık bekleme süresine bak.');
      case 'emekli':
        if (!p.emekli) return r('bak', 'Emekli aylığı almama şartı var.', null, 'emekli');
        return p.emekli === 'hayir' ? r('tamam', 'Emekli aylığı almıyorsun.') : r('yok', 'Emekli aylığı alanlar başvuramıyor.');
      case 'tercih': return r('bilgi', 'Zorunlu değil, tercih sebebi.');
      default: return r('bak', 'Bunu otomatik anlayamadım, sen oku.');
    }
  }

  function incele(metin, profil, bugun = new Date()) {
    const sartlar = cikar(metin);
    const coklu = cokluMu(sartlar);
    const kadroyaOzel = ['okul', 'bolum', 'kpss', 'yasUst', 'dogum', 'ehliyet', 'boy', 'cinsiyet', 'deneyim', 'belge'];
    const gorulen = new Set();
    const satirlar = sartlar.map(s => {
      const r = degerlendir(s, profil || {}, bugun);
      if (coklu && r.durum !== 'bilgi' && kadroyaOzel.includes(s.tur)) {
        if (r.durum === 'yok') { r.durum = 'bak'; r.not += ' (Sadece bazı kadroların şartı olabilir.)'; }
      }
      return { ...s, ...r };
    }).filter(s => {
      // Her kadroda tekrar eden aynı madde bir kez gösterilir.
      const anahtar = s.tur + s.not + kucuk(s.cumle).replace(/^\S{1,3}[.)]\s*/, '');
      return !gorulen.has(anahtar) && gorulen.add(anahtar);
    });
    const say = { tamam: 0, bak: 0, yok: 0, bilgi: 0 };
    satirlar.forEach(s => say[s.durum]++);

    let sonuc = 'uygun';
    if (say.yok) sonuc = 'uymuyor';
    // Okul şartı bulunmadıysa metin eksik okunmuştur.
    else if (say.bak || coklu || !sartlar.some(s => s.tur === 'okul')) sonuc = 'bak';

    const engeller = satirlar.filter(s => s.durum === 'yok');
    const eksik = tekil(satirlar.filter(s => s.alinabilir && s.durum !== 'tamam').map(s => s.alinabilir));
    const eksikYeter = engeller.length > 0 && engeller.every(s => s.alinabilir);
    const k = kucuk(metin);
    const evrak = Object.keys(EVRAK).filter(ad => EVRAK[ad].test(k));
    const tarihler = cumleler(metin)
      .filter(c => /başvuru/i.test(c) && /\d{1,2}[./]\d{1,2}[./]20\d\d|\d{1,2} (ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)/i.test(c))
      .filter(c => !/yaşın|doğum|mezun ol|geçerlilik/.test(kucuk(c)))
      .map(c => ({ c, puan: (/arasında|tarihlerinde|başlayıp|başvuru(lar)? tarih(i|leri) ?:|son başvuru tarihi ?:?\s*\d/.test(kucuk(c)) ? 1 : 0) }))
      .sort((a, b) => b.puan - a.puan).map(x => x.c)
      .slice(0, 4);
    return { sonuc, coklu, satirlar, say, eksik, eksikYeter, evrak, tarihler };
  }

  const api = { kucuk, bolumAd, incele, cikar, degerlendir, puanListe, puanSec, PUAN_OKUL, OKUL, BELGELER: Object.keys(BELGELER) };
  if (typeof module !== 'undefined') module.exports = api; else kok.Motor = api;
})(this);
