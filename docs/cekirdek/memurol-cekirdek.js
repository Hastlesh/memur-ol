/* Memur Ol çekirdeği — sürüm 202611251534 — üretildi, elle değiştirme (node cekirdek/paketle.js) */
var window = this;
var CEKIRDEK_SURUM = 202611251534, CEKIRDEK_API = 1;
/* motor.js */
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
          return fark <= +f[1] ? r('tamam', `Boy ${p.boy} cm, kilo ${p.kilo}: boy ve boy-kilo şartı tutuyor.`) : r('yok', `Boy-kilo farkın ${fark} kg, en fazla ${f[1]} olmalı.`);
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


/* il.js */
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


/* sure.js */
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
      // "sözlü/uygulamalı sınav şeklinde 7-11 Aralık tarihleri arasında" başvuru değil sınav tarihidir
      // (belediye kalıbı "sözlü ve uygulamalı sınava katılabilmek için; 09/12-11/12" ise başvuru tarihidir, atlanmaz)
      if (/itiraz|sınav(ı|lar)? (tarih|şeklinde)|sonuç|doğum|teslim|tercih tarih|göreve başla/.test(yakin)) continue;
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


/* taban.js */
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


/* taban_veri.js */
/* GSB Personel Genel Müdürlüğü yerleştirme istatistikleri (kişi bilgisi yok).
   Kaynak adresleri her setin içinde. Kişisel kullanım için; yayınlamadan önce kurumdan izin al. */
window.TABAN_VERI = [
{"kurum":"GENÇLİK VE SPOR BAKANLIĞI","yil":2026,"kpssYil":2024,"satirlar":[["Koruma ve Güvenlik Görevlisi - 1. Grup","Adana",81.64452,80.8878],["Koruma ve Güvenlik Görevlisi - 1. Grup","Afyonkarahisar",82.72674,79.31446],["Koruma ve Güvenlik Görevlisi - 1. Grup","Ankara",79.99175,78.28054],["Koruma ve Güvenlik Görevlisi - 1. Grup","Antalya",80.82093,79.77621],["Koruma ve Güvenlik Görevlisi - 1. Grup","Aydın",79.78627,78.87528],["Koruma ve Güvenlik Görevlisi - 1. Grup","Balıkesir",80.72549,77.96227],["Koruma ve Güvenlik Görevlisi - 1. Grup","Bilecik",78.84745,76.86472],["Koruma ve Güvenlik Görevlisi - 1. Grup","Bursa",80.61019,78.15166],["Koruma ve Güvenlik Görevlisi - 1. Grup","Denizli",79.31446,78.77011],["Koruma ve Güvenlik Görevlisi - 1. Grup","Diyarbakır",81.81973,79.76817],["Koruma ve Güvenlik Görevlisi - 1. Grup","Düzce",76.64269,76.46863],["Koruma ve Güvenlik Görevlisi - 1. Grup","Elazığ",81.2585,80.82944],["Koruma ve Güvenlik Görevlisi - 1. Grup","Erzincan",81.72908,80.18432],["Koruma ve Güvenlik Görevlisi - 1. Grup","Giresun",76.99245,76.92517],["Koruma ve Güvenlik Görevlisi - 1. Grup","İstanbul",77.87804,76.68099],["Koruma ve Güvenlik Görevlisi - 1. Grup","İzmir",78.05372,75.87281],["Koruma ve Güvenlik Görevlisi - 1. Grup","Kahramanmaraş",81.81973,80.82012],["Koruma ve Güvenlik Görevlisi - 1. Grup","Kars",79.32736,79.1533],["Koruma ve Güvenlik Görevlisi - 1. Grup","Kastamonu",77.13956,75.64234],["Koruma ve Güvenlik Görevlisi - 1. Grup","Kayseri",80.15534,76.31719],["Koruma ve Güvenlik Görevlisi - 1. Grup","Konya",80.19965,76.61088],["Koruma ve Güvenlik Görevlisi - 1. Grup","Malatya",79.1025,78.46109],["Koruma ve Güvenlik Görevlisi - 1. Grup","Manisa",80.18918,79.47765],["Koruma ve Güvenlik Görevlisi - 1. Grup","Mersin",82.84677,78.7383],["Koruma ve Güvenlik Görevlisi - 1. Grup","Muğla",80.03045,77.64959],["Koruma ve Güvenlik Görevlisi - 1. Grup","Rize",79.75284,79.45671],["Koruma ve Güvenlik Görevlisi - 1. Grup","Samsun",80.29516,79.8374],["Koruma ve Güvenlik Görevlisi - 1. Grup","Siirt",78.72094,78.66055],["Koruma ve Güvenlik Görevlisi - 1. Grup","Tekirdağ",77.1093,76.55691],["Koruma ve Güvenlik Görevlisi - 1. Grup","Trabzon",79.08757,77.94572],["Koruma ve Güvenlik Görevlisi - 1. Grup","Zonguldak",78.79348,76.95901],["Koruma ve Güvenlik Görevlisi - 2. Grup","Adana",81.77339,81.05505],["Koruma ve Güvenlik Görevlisi - 2. Grup","Afyonkarahisar",78.1343,77.54361],["Koruma ve Güvenlik Görevlisi - 2. Grup","Amasya",77.25074,76.24059],["Koruma ve Güvenlik Görevlisi - 2. Grup","Ankara",79.06468,77.70039],["Koruma ve Güvenlik Görevlisi - 2. Grup","Antalya",79.54736,78.09884],["Koruma ve Güvenlik Görevlisi - 2. Grup","Aydın",79.4736,77.2785],["Koruma ve Güvenlik Görevlisi - 2. Grup","Balıkesir",84.36175,79.36323],["Koruma ve Güvenlik Görevlisi - 2. Grup","Bilecik",75.91786,74.51055],["Koruma ve Güvenlik Görevlisi - 2. Grup","Bolu",82.26256,81.28187],["Koruma ve Güvenlik Görevlisi - 2. Grup","Burdur",81.20331,77.12821],["Koruma ve Güvenlik Görevlisi - 2. Grup","Bursa",80.62066,78.35113],["Koruma ve Güvenlik Görevlisi - 2. Grup","Denizli",80.39911,76.86269],["Koruma ve Güvenlik Görevlisi - 2. Grup","Edirne",77.45013,76.01337],["Koruma ve Güvenlik Görevlisi - 2. Grup","Erzurum",81.6485,77.39981],["Koruma ve Güvenlik Görevlisi - 2. Grup","Eskişehir",78.25433,75.93117],["Koruma ve Güvenlik Görevlisi - 2. Grup","Gaziantep",86.68134,78.02029],["Koruma ve Güvenlik Görevlisi - 2. Grup","Giresun",78.54167,77.52673],["Koruma ve Güvenlik Görevlisi - 2. Grup","İstanbul",78.80355,77.3039],["Koruma ve Güvenlik Görevlisi - 2. Grup","İzmir",78.7512,77.9905],["Koruma ve Güvenlik Görevlisi - 2. Grup","Kayseri",84.2707,78.31641],["Koruma ve Güvenlik Görevlisi - 2. Grup","Kocaeli",79.5304,78.01826],["Koruma ve Güvenlik Görevlisi - 2. Grup","Konya",79.30757,77.84622],["Koruma ve Güvenlik Görevlisi - 2. Grup","Malatya",81.58528,78.98004],["Koruma ve Güvenlik Görevlisi - 2. Grup","Manisa",79.08602,77.40582],["Koruma ve Güvenlik Görevlisi - 2. Grup","Mersin",78.60294,76.05849],["Koruma ve Güvenlik Görevlisi - 2. Grup","Muğla",80.48044,79.8495],["Koruma ve Güvenlik Görevlisi - 2. Grup","Rize",78.00536,77.85709],["Koruma ve Güvenlik Görevlisi - 2. Grup","Samsun",81.09132,79.34304],["Koruma ve Güvenlik Görevlisi - 2. Grup","Sinop",80.75846,79.95831],["Koruma ve Güvenlik Görevlisi - 2. Grup","Trabzon",80.06827,76.66451],["Koruma ve Güvenlik Görevlisi - 2. Grup","Uşak",76.42114,76.15197],["Koruma ve Güvenlik Görevlisi - 2. Grup","Van",80.23552,78.83982],["Koruma ve Güvenlik Görevlisi - 2. Grup","Yalova",80.47321,77.80394],["Koruma ve Güvenlik Görevlisi - 2. Grup","Zonguldak",84.46773,77.8885],["Koruma ve Güvenlik Görevlisi - 3. Grup","Adana",79.40249,77.68756],["Koruma ve Güvenlik Görevlisi - 3. Grup","Adıyaman",74.5596,72.22731],["Koruma ve Güvenlik Görevlisi - 3. Grup","Afyonkarahisar",79.0461,77.48207],["Koruma ve Güvenlik Görevlisi - 3. Grup","Ağrı",75.14489,72.20978],["Koruma ve Güvenlik Görevlisi - 3. Grup","Aksaray",79.86895,78.02453],["Koruma ve Güvenlik Görevlisi - 3. Grup","Amasya",79.01881,78.07324],["Koruma ve Güvenlik Görevlisi - 3. Grup","Ankara",76.54039,72.79019],["Koruma ve Güvenlik Görevlisi - 3. Grup","Antalya",75.42439,73.23035],["Koruma ve Güvenlik Görevlisi - 3. Grup","Ardahan",78.61171,77.40029],["Koruma ve Güvenlik Görevlisi - 3. Grup","Artvin",75.02606,72.62564],["Koruma ve Güvenlik Görevlisi - 3. Grup","Aydın",79.68099,78.50752],["Koruma ve Güvenlik Görevlisi - 3. Grup","Balıkesir",77.51913,74.82745],["Koruma ve Güvenlik Görevlisi - 3. Grup","Batman",84.07196,83.84993],["Koruma ve Güvenlik Görevlisi - 3. Grup","Bilecik",76.35542,74.99588],["Koruma ve Güvenlik Görevlisi - 3. Grup","Bingöl",75.74672,74.62973],["Koruma ve Güvenlik Görevlisi - 3. Grup","Bitlis",80.80286,77.85211],["Koruma ve Güvenlik Görevlisi - 3. Grup","Bolu",71.28762,70.80941],["Koruma ve Güvenlik Görevlisi - 3. Grup","Burdur",78.73731,78.01188],["Koruma ve Güvenlik Görevlisi - 3. Grup","Bursa",79.06164,76.59298],["Koruma ve Güvenlik Görevlisi - 3. Grup","Çanakkale",76.65922,74.86928],["Koruma ve Güvenlik Görevlisi - 3. Grup","Çankırı",77.3214,75.42439],["Koruma ve Güvenlik Görevlisi - 3. Grup","Çorum",79.59922,75.43116],["Koruma ve Güvenlik Görevlisi - 3. Grup","Denizli",77.83946,73.83118],["Koruma ve Güvenlik Görevlisi - 3. Grup","Diyarbakır",83.08256,80.54767],["Koruma ve Güvenlik Görevlisi - 3. Grup","Düzce",76.62804,74.35999],["Koruma ve Güvenlik Görevlisi - 3. Grup","Edirne",76.49267,74.08538],["Koruma ve Güvenlik Görevlisi - 3. Grup","Elazığ",78.57665,76.35831],["Koruma ve Güvenlik Görevlisi - 3. Grup","Erzincan",79.99943,79.03922],["Koruma ve Güvenlik Görevlisi - 3. Grup","Erzurum",81.71048,80.06179],["Koruma ve Güvenlik Görevlisi - 3. Grup","Eskişehir",82.88983,78.04206],["Koruma ve Güvenlik Görevlisi - 3. Grup","Gaziantep",73.96754,70.94866],["Koruma ve Güvenlik Görevlisi - 3. Grup","Giresun",76.39625,72.42403],["Koruma ve Güvenlik Görevlisi - 3. Grup","Gümüşhane",77.24251,75.96974],["Koruma ve Güvenlik Görevlisi - 3. Grup","Hakkâri",75.67271,71.99453],["Koruma ve Güvenlik Görevlisi - 3. Grup","Hatay",78.39357,73.79223],["Koruma ve Güvenlik Görevlisi - 3. Grup","Iğdır",79.45508,78.28938],["Koruma ve Güvenlik Görevlisi - 3. Grup","Isparta",82.49927,77.92811],["Koruma ve Güvenlik Görevlisi - 3. Grup","İstanbul",77.03026,73.9529],["Koruma ve Güvenlik Görevlisi - 3. Grup","İzmir",78.88244,74.29863],["Koruma ve Güvenlik Görevlisi - 3. Grup","Kahramanmaraş",81.71725,79.32072],["Koruma ve Güvenlik Görevlisi - 3. Grup","Karabük",78.565,76.28718],["Koruma ve Güvenlik Görevlisi - 3. Grup","Karaman",75.67171,73.69293],["Koruma ve Güvenlik Görevlisi - 3. Grup","Kars",77.15197,72.6607],["Koruma ve Güvenlik Görevlisi - 3. Grup","Kastamonu",77.09838,76.35531],["Koruma ve Güvenlik Görevlisi - 3. Grup","Kayseri",80.02373,78.86691],["Koruma ve Güvenlik Görevlisi - 3. Grup","Kırıkkale",76.99908,76.04663],["Koruma ve Güvenlik Görevlisi - 3. Grup","Kocaeli",80.46489,78.34198],["Koruma ve Güvenlik Görevlisi - 3. Grup","Konya",77.66226,74.20421],["Koruma ve Güvenlik Görevlisi - 3. Grup","Kütahya",79.15417,77.06532],["Koruma ve Güvenlik Görevlisi - 3. Grup","Malatya",76.39526,72.95085],["Koruma ve Güvenlik Görevlisi - 3. Grup","Manisa",79.69264,77.16362],["Koruma ve Güvenlik Görevlisi - 3. Grup","Mardin",81.67442,78.69548],["Koruma ve Güvenlik Görevlisi - 3. Grup","Mersin",80.34318,76.76241],["Koruma ve Güvenlik Görevlisi - 3. Grup","Muğla",78.9448,77.26393],["Koruma ve Güvenlik Görevlisi - 3. Grup","Muş",80.21757,75.17219],["Koruma ve Güvenlik Görevlisi - 3. Grup","Nevşehir",79.40737,77.61743],["Koruma ve Güvenlik Görevlisi - 3. Grup","Niğde",80.52536,74.45541],["Koruma ve Güvenlik Görevlisi - 3. Grup","Ordu",79.01293,77.91446],["Koruma ve Güvenlik Görevlisi - 3. Grup","Osmaniye",80.47665,79.04899],["Koruma ve Güvenlik Görevlisi - 3. Grup","Rize",75.06989,73.02775],["Koruma ve Güvenlik Görevlisi - 3. Grup","Sakarya",78.73931,74.33958],["Koruma ve Güvenlik Görevlisi - 3. Grup","Samsun",81.10378,77.88916],["Koruma ve Güvenlik Görevlisi - 3. Grup","Siirt",82.10094,79.07528],["Koruma ve Güvenlik Görevlisi - 3. Grup","Sinop",79.68299,79.20188],["Koruma ve Güvenlik Görevlisi - 3. Grup","Sivas",81.39304,79.81347],["Koruma ve Güvenlik Görevlisi - 3. Grup","Şanlıurfa",83.12739,79.97702],["Koruma ve Güvenlik Görevlisi - 3. Grup","Şırnak",81.80879,80.51749],["Koruma ve Güvenlik Görevlisi - 3. Grup","Tekirdağ",78.02841,77.23863],["Koruma ve Güvenlik Görevlisi - 3. Grup","Tokat",79.20577,77.36035],["Koruma ve Güvenlik Görevlisi - 3. Grup","Trabzon",79.03534,76.34466],["Koruma ve Güvenlik Görevlisi - 3. Grup","Tunceli",80.58373,79.7044],["Koruma ve Güvenlik Görevlisi - 3. Grup","Uşak",79.82024,78.52317],["Koruma ve Güvenlik Görevlisi - 3. Grup","Van",80.99759,79.61863],["Koruma ve Güvenlik Görevlisi - 3. Grup","Yalova",78.06636,74.96282],["Koruma ve Güvenlik Görevlisi - 3. Grup","Yozgat",77.6272,72.77166],["Koruma ve Güvenlik Görevlisi - 3. Grup","Zonguldak",75.66395,73.67051],["Koruma ve Güvenlik Görevlisi - 4. Grup","Adana",82.77289,80.947],["Koruma ve Güvenlik Görevlisi - 4. Grup","Adıyaman",82.14576,80.08609],["Koruma ve Güvenlik Görevlisi - 4. Grup","Afyonkarahisar",80.65196,79.93519],["Koruma ve Güvenlik Görevlisi - 4. Grup","Ağrı",80.62755,77.51036],["Koruma ve Güvenlik Görevlisi - 4. Grup","Aksaray",80.72398,80.23999],["Koruma ve Güvenlik Görevlisi - 4. Grup","Amasya",80.66262,79.28954],["Koruma ve Güvenlik Görevlisi - 4. Grup","Ankara",81.69584,78.96133],["Koruma ve Güvenlik Görevlisi - 4. Grup","Antalya",81.33357,79.77741],["Koruma ve Güvenlik Görevlisi - 4. Grup","Ardahan",80.98006,80.18639],["Koruma ve Güvenlik Görevlisi - 4. Grup","Artvin",79.98678,77.03414],["Koruma ve Güvenlik Görevlisi - 4. Grup","Aydın",81.58388,79.66834],["Koruma ve Güvenlik Görevlisi - 4. Grup","Balıkesir",80.99271,78.83961],["Koruma ve Güvenlik Görevlisi - 4. Grup","Bilecik",81.39204,80.78533],["Koruma ve Güvenlik Görevlisi - 4. Grup","Bingöl",84.99811,79.99943],["Koruma ve Güvenlik Görevlisi - 4. Grup","Bitlis",82.52457,80.03061],["Koruma ve Güvenlik Görevlisi - 4. Grup","Bolu",79.29054,78.54647],["Koruma ve Güvenlik Görevlisi - 4. Grup","Burdur",81.64324,79.51056],["Koruma ve Güvenlik Görevlisi - 4. Grup","Bursa",80.9237,78.99539],["Koruma ve Güvenlik Görevlisi - 4. Grup","Çanakkale",77.54931,76.67386],["Koruma ve Güvenlik Görevlisi - 4. Grup","Çankırı",78.27574,77.78109],["Koruma ve Güvenlik Görevlisi - 4. Grup","Çorum",80.50972,79.02369],["Koruma ve Güvenlik Görevlisi - 4. Grup","Denizli",81.6053,80.77557],["Koruma ve Güvenlik Görevlisi - 4. Grup","Düzce",80.38312,79.01392],["Koruma ve Güvenlik Görevlisi - 4. Grup","Edirne",80.83305,79.72093],["Koruma ve Güvenlik Görevlisi - 4. Grup","Elazığ",81.7309,80.61102],["Koruma ve Güvenlik Görevlisi - 4. Grup","Erzincan",79.88848,76.6378],["Koruma ve Güvenlik Görevlisi - 4. Grup","Erzurum",81.06383,80.19128],["Koruma ve Güvenlik Görevlisi - 4. Grup","Eskişehir",80.6412,78.05371],["Koruma ve Güvenlik Görevlisi - 4. Grup","Gaziantep",84.67966,80.94211],["Koruma ve Güvenlik Görevlisi - 4. Grup","Giresun",81.90332,80.6665],["Koruma ve Güvenlik Görevlisi - 4. Grup","Gümüşhane",81.98898,80.67038],["Koruma ve Güvenlik Görevlisi - 4. Grup","Hakkâri",81.48846,80.5409],["Koruma ve Güvenlik Görevlisi - 4. Grup","Hatay",82.99402,80.1611],["Koruma ve Güvenlik Görevlisi - 4. Grup","Iğdır",80.33152,74.3327],["Koruma ve Güvenlik Görevlisi - 4. Grup","Isparta",79.94784,79.61087],["Koruma ve Güvenlik Görevlisi - 4. Grup","İstanbul",80.6938,77.60867],["Koruma ve Güvenlik Görevlisi - 4. Grup","İzmir",80.15233,78.80943],["Koruma ve Güvenlik Görevlisi - 4. Grup","Karabük",80.43671,79.10446],["Koruma ve Güvenlik Görevlisi - 4. Grup","Karaman",81.96757,79.92154],["Koruma ve Güvenlik Görevlisi - 4. Grup","Kars",84.91045,80.12992],["Koruma ve Güvenlik Görevlisi - 4. Grup","Kastamonu",81.02877,79.21553],["Koruma ve Güvenlik Görevlisi - 4. Grup","Kayseri",82.14188,80.68991],["Koruma ve Güvenlik Görevlisi - 4. Grup","Kırıkkale",80.59837,79.3236],["Koruma ve Güvenlik Görevlisi - 4. Grup","Kırklareli",79.49203,78.93992],["Koruma ve Güvenlik Görevlisi - 4. Grup","Kilis",82.82648,79.48526],["Koruma ve Güvenlik Görevlisi - 4. Grup","Kocaeli",80.44059,79.17559],["Koruma ve Güvenlik Görevlisi - 4. Grup","Konya",81.71437,78.80455],["Koruma ve Güvenlik Görevlisi - 4. Grup","Kütahya",80.3617,79.67422],["Koruma ve Güvenlik Görevlisi - 4. Grup","Malatya",82.42526,80.30523],["Koruma ve Güvenlik Görevlisi - 4. Grup","Manisa",81.85162,80.7678],["Koruma ve Güvenlik Görevlisi - 4. Grup","Mardin",82.43303,79.70241],["Koruma ve Güvenlik Görevlisi - 4. Grup","Mersin",81.19043,78.19296],["Koruma ve Güvenlik Görevlisi - 4. Grup","Muğla",79.13464,77.0692],["Koruma ve Güvenlik Görevlisi - 4. Grup","Muş",82.49827,81.0736],["Koruma ve Güvenlik Görevlisi - 4. Grup","Nevşehir",81.47382,80.64409],["Koruma ve Güvenlik Görevlisi - 4. Grup","Ordu",82.02016,76.81212],["Koruma ve Güvenlik Görevlisi - 4. Grup","Osmaniye",82.42626,80.8204],["Koruma ve Güvenlik Görevlisi - 4. Grup","Rize",81.32092,80.21857],["Koruma ve Güvenlik Görevlisi - 4. Grup","Sakarya",79.65858,77.73815],["Koruma ve Güvenlik Görevlisi - 4. Grup","Samsun",81.50111,79.78229],["Koruma ve Güvenlik Görevlisi - 4. Grup","Siirt",81.77084,74.83333],["Koruma ve Güvenlik Görevlisi - 4. Grup","Sinop",79.11423,78.32933],["Koruma ve Güvenlik Görevlisi - 4. Grup","Sivas",83.44972,79.08016],["Koruma ve Güvenlik Görevlisi - 4. Grup","Şanlıurfa",81.05118,80.47277],["Koruma ve Güvenlik Görevlisi - 4. Grup","Şırnak",82.93455,80.79022],["Koruma ve Güvenlik Görevlisi - 4. Grup","Tokat",81.40469,80.53701],["Koruma ve Güvenlik Görevlisi - 4. Grup","Trabzon",77.68567,76.184],["Koruma ve Güvenlik Görevlisi - 4. Grup","Tunceli",81.91398,80.70744],["Koruma ve Güvenlik Görevlisi - 4. Grup","Uşak",81.64036,80.07344],["Koruma ve Güvenlik Görevlisi - 4. Grup","Van",83.04362,79.17947],["Koruma ve Güvenlik Görevlisi - 4. Grup","Yalova",80.50195,79.8806],["Koruma ve Güvenlik Görevlisi - 4. Grup","Yozgat",80.95476,79.32749],["Koruma ve Güvenlik Görevlisi - 4. Grup","Zonguldak",80.8184,77.27081],["Destek Personeli (Temizlik) - 1. Grup","Adana",81.19702,79.05882],["Destek Personeli (Temizlik) - 1. Grup","Afyonkarahisar",81.32686,80.01329],["Destek Personeli (Temizlik) - 1. Grup","Amasya",81.41525,80.81236],["Destek Personeli (Temizlik) - 1. Grup","Ankara",81.84737,79.97152],["Destek Personeli (Temizlik) - 1. Grup","Antalya",79.81795,76.78594],["Destek Personeli (Temizlik) - 1. Grup","Artvin",78.98547,76.88754],["Destek Personeli (Temizlik) - 1. Grup","Aydın",79.92523,78.12207],["Destek Personeli (Temizlik) - 1. Grup","Balıkesir",81.41676,79.64752],["Destek Personeli (Temizlik) - 1. Grup","Bilecik",79.67609,76.6922],["Destek Personeli (Temizlik) - 1. Grup","Bitlis",81.93543,79.97871],["Destek Personeli (Temizlik) - 1. Grup","Bolu",79.40622,78.11305],["Destek Personeli (Temizlik) - 1. Grup","Burdur",79.97152,78.67233],["Destek Personeli (Temizlik) - 1. Grup","Bursa",80.5425,77.86273],["Destek Personeli (Temizlik) - 1. Grup","Çanakkale",82.08181,77.75846],["Destek Personeli (Temizlik) - 1. Grup","Çankırı",83.51619,79.1021],["Destek Personeli (Temizlik) - 1. Grup","Çorum",80.18791,78.72763],["Destek Personeli (Temizlik) - 1. Grup","Diyarbakır",85.15409,83.94413],["Destek Personeli (Temizlik) - 1. Grup","Düzce",78.02231,76.28498],["Destek Personeli (Temizlik) - 1. Grup","Elazığ",87.14474,82.59748],["Destek Personeli (Temizlik) - 1. Grup","Erzincan",79.62228,78.0833],["Destek Personeli (Temizlik) - 1. Grup","Eskişehir",86.56291,85.14774],["Destek Personeli (Temizlik) - 1. Grup","Giresun",78.96475,78.77693],["Destek Personeli (Temizlik) - 1. Grup","Gümüşhane",88.39732,85.4669],["Destek Personeli (Temizlik) - 1. Grup","Hakkâri",84.21099,80.80818],["Destek Personeli (Temizlik) - 1. Grup","Iğdır",80.30989,78.45627],["Destek Personeli (Temizlik) - 1. Grup","İstanbul",80.27414,77.97151],["Destek Personeli (Temizlik) - 1. Grup","İzmir",79.87861,77.87777],["Destek Personeli (Temizlik) - 1. Grup","Kahramanmaraş",82.8244,79.35392],["Destek Personeli (Temizlik) - 1. Grup","Karabük",75.18263,74.61015],["Destek Personeli (Temizlik) - 1. Grup","Karaman",80.14914,78.97227],["Destek Personeli (Temizlik) - 1. Grup","Kastamonu",83.37616,80.32911],["Destek Personeli (Temizlik) - 1. Grup","Kayseri",80.30722,78.18339],["Destek Personeli (Temizlik) - 1. Grup","Kırşehir",86.8839,78.96324],["Destek Personeli (Temizlik) - 1. Grup","Konya",79.99976,77.99407],["Destek Personeli (Temizlik) - 1. Grup","Malatya",84.35436,83.701],["Destek Personeli (Temizlik) - 1. Grup","Manisa",82.23805,76.88002],["Destek Personeli (Temizlik) - 1. Grup","Mardin",80.81387,78.09984],["Destek Personeli (Temizlik) - 1. Grup","Mersin",80.88421,78.90526],["Destek Personeli (Temizlik) - 1. Grup","Muğla",78.4962,77.49728],["Destek Personeli (Temizlik) - 1. Grup","Nevşehir",79.38517,78.45777],["Destek Personeli (Temizlik) - 1. Grup","Niğde",79.13603,77.87777],["Destek Personeli (Temizlik) - 1. Grup","Ordu",79.6151,78.67867],["Destek Personeli (Temizlik) - 1. Grup","Osmaniye",85.89484,83.29111],["Destek Personeli (Temizlik) - 1. Grup","Rize",77.66555,76.99783],["Destek Personeli (Temizlik) - 1. Grup","Sakarya",80.7096,78.82622],["Destek Personeli (Temizlik) - 1. Grup","Samsun",81.5862,79.91019],["Destek Personeli (Temizlik) - 1. Grup","Siirt",82.64861,80.67718],["Destek Personeli (Temizlik) - 1. Grup","Şanlıurfa",82.71862,81.41375],["Destek Personeli (Temizlik) - 1. Grup","Şırnak",89.03564,83.65655],["Destek Personeli (Temizlik) - 1. Grup","Tekirdağ",78.96057,77.69714],["Destek Personeli (Temizlik) - 1. Grup","Trabzon",85.14657,79.40171],["Destek Personeli (Temizlik) - 1. Grup","Tunceli",78.55452,76.99783],["Destek Personeli (Temizlik) - 1. Grup","Van",84.97195,81.26554],["Destek Personeli (Temizlik) - 1. Grup","Yalova",78.06559,76.49536],["Destek Personeli (Temizlik) - 1. Grup","Zonguldak",78.51308,77.24664],["Destek Personeli (Temizlik) - 2. Grup","Adana",79.30646,77.62562],["Destek Personeli (Temizlik) - 2. Grup","Afyonkarahisar",77.51683,75.906],["Destek Personeli (Temizlik) - 2. Grup","Amasya",78.78896,77.36294],["Destek Personeli (Temizlik) - 2. Grup","Ankara",78.77091,76.58192],["Destek Personeli (Temizlik) - 2. Grup","Antalya",77.64667,75.46336],["Destek Personeli (Temizlik) - 2. Grup","Ardahan",73.47087,71.86003],["Destek Personeli (Temizlik) - 2. Grup","Artvin",77.63765,75.21271],["Destek Personeli (Temizlik) - 2. Grup","Aydın",76.16116,74.82504],["Destek Personeli (Temizlik) - 2. Grup","Balıkesir",77.99557,76.01211],["Destek Personeli (Temizlik) - 2. Grup","Bilecik",77.87175,76.64441],["Destek Personeli (Temizlik) - 2. Grup","Bitlis",81.84921,80.61402],["Destek Personeli (Temizlik) - 2. Grup","Bolu",74.42534,72.4656],["Destek Personeli (Temizlik) - 2. Grup","Burdur",77.12582,75.23794],["Destek Personeli (Temizlik) - 2. Grup","Bursa",76.63539,75.89731],["Destek Personeli (Temizlik) - 2. Grup","Çanakkale",80.73934,76.74868],["Destek Personeli (Temizlik) - 2. Grup","Çankırı",75.77316,73.81075],["Destek Personeli (Temizlik) - 2. Grup","Çorum",82.49889,79.13937],["Destek Personeli (Temizlik) - 2. Grup","Düzce",75.97485,74.30452],["Destek Personeli (Temizlik) - 2. Grup","Edirne",74.45658,73.29926],["Destek Personeli (Temizlik) - 2. Grup","Erzincan",80.53347,79.61058],["Destek Personeli (Temizlik) - 2. Grup","Eskişehir",78.74418,76.87551],["Destek Personeli (Temizlik) - 2. Grup","Gaziantep",85.80712,78.19542],["Destek Personeli (Temizlik) - 2. Grup","Giresun",80.51426,76.6414],["Destek Personeli (Temizlik) - 2. Grup","Gümüşhane",80.80334,77.82998],["Destek Personeli (Temizlik) - 2. Grup","Hakkâri",80.43789,79.96517],["Destek Personeli (Temizlik) - 2. Grup","Iğdır",79.11263,76.81602],["Destek Personeli (Temizlik) - 2. Grup","Isparta",77.76414,74.70991],["Destek Personeli (Temizlik) - 2. Grup","İstanbul",77.94778,76.36402],["Destek Personeli (Temizlik) - 2. Grup","İzmir",79.19768,76.32676],["Destek Personeli (Temizlik) - 2. Grup","Karabük",78.98998,76.69822],["Destek Personeli (Temizlik) - 2. Grup","Karaman",84.21132,81.11648],["Destek Personeli (Temizlik) - 2. Grup","Kastamonu",88.18577,76.10167],["Destek Personeli (Temizlik) - 2. Grup","Kayseri",78.25642,75.27821],["Destek Personeli (Temizlik) - 2. Grup","Kocaeli",78.31172,74.22666],["Destek Personeli (Temizlik) - 2. Grup","Konya",77.22291,74.53713],["Destek Personeli (Temizlik) - 2. Grup","Malatya",81.14689,78.99332],["Destek Personeli (Temizlik) - 2. Grup","Manisa",79.13302,76.64742],["Destek Personeli (Temizlik) - 2. Grup","Mardin",80.75555,79.74493],["Destek Personeli (Temizlik) - 2. Grup","Mersin",79.59137,77.45701],["Destek Personeli (Temizlik) - 2. Grup","Muğla",76.28949,74.0614],["Destek Personeli (Temizlik) - 2. Grup","Nevşehir",79.61961,78.02799],["Destek Personeli (Temizlik) - 2. Grup","Ordu",76.48483,75.08889],["Destek Personeli (Temizlik) - 2. Grup","Osmaniye",76.84877,74.86681],["Destek Personeli (Temizlik) - 2. Grup","Rize",77.21572,75.66321],["Destek Personeli (Temizlik) - 2. Grup","Sakarya",75.82997,74.57138],["Destek Personeli (Temizlik) - 2. Grup","Samsun",77.92523,76.48634],["Destek Personeli (Temizlik) - 2. Grup","Siirt",81.82632,78.83825],["Destek Personeli (Temizlik) - 2. Grup","Sinop",77.40505,74.99063],["Destek Personeli (Temizlik) - 2. Grup","Şanlıurfa",86.35854,84.01899],["Destek Personeli (Temizlik) - 2. Grup","Şırnak",77.36026,76.5891],["Destek Personeli (Temizlik) - 2. Grup","Tekirdağ",75.99406,73.63045],["Destek Personeli (Temizlik) - 2. Grup","Tokat",81.68963,79.94445],["Destek Personeli (Temizlik) - 2. Grup","Trabzon",77.91654,74.26726],["Destek Personeli (Temizlik) - 2. Grup","Tunceli",76.81752,75.47656],["Destek Personeli (Temizlik) - 2. Grup","Van",80.52144,77.88529],["Destek Personeli (Temizlik) - 2. Grup","Yalova",75.51081,74.70991],["Destek Personeli (Temizlik) - 2. Grup","Zonguldak",74.18639,73.55141],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Adana",81.54208,74.29968],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Adıyaman",77.41557,76.74684],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Afyonkarahisar",74.42834,73.66771],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Ankara",78.78562,74.45959],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Antalya",73.23225,71.88109],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Aydın",75.00233,73.66738],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Balıkesir",75.71367,75.326],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Batman",83.28843,79.01404],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Bingöl",73.48257,72.78476],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Burdur",73.85553,73.42308],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Bursa",78.1996,74.44907],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Çanakkale",73.57514,70.21528],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Denizli",76.47731,74.18789],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Elazığ",77.6064,75.34405],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Erzincan",75.20519,72.13926],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Erzurum",76.45208,75.14386],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Eskişehir",75.74943,73.31129],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Gümüşhane",73.56494,73.55592],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Hakkâri",84.31141,73.34254],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Iğdır",72.71023,72.06891],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","İstanbul",75.11111,73.52618],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","İzmir",75.43027,73.8318],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Kahramanmaraş",74.53111,72.1675],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Karabük",82.00428,80.67384],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Kars",83.67276,81.13636],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Kayseri",75.73773,73.59318],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Kilis",73.56043,71.54539],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Kocaeli",76.30453,74.08846],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Konya",76.63088,74.22097],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Kütahya",79.64484,75.62561],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Malatya",74.65944,72.58341],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Manisa",76.07912,74.08362],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Mersin",83.12284,77.39151],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Muş",77.3215,76.09867],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Niğde",74.61316,73.15772],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Ordu",76.43704,71.71399],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Osmaniye",76.18522,74.85779],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Rize",71.31429,71.01769],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Sakarya",77.52586,75.81978],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Samsun",78.54851,75.70164],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Siirt",75.6109,71.81258],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Şanlıurfa",94.1644,79.80709],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Trabzon",76.33578,72.56419],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Tunceli",73.93156,73.66921],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Van",77.13485,76.1122],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Zonguldak",72.59844,72.14043],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Adana",63.39246,58.34724],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Adıyaman",73.65718,65.62056],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Afyonkarahisar",68.07975,66.37067],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Amasya",69.66653,68.43618],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Ankara",71.17276,69.42039],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Antalya",66.41846,64.49448],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Artvin",67.11927,65.65632],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Aydın",68.35413,66.7824],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Balıkesir",65.25361,63.82642],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Bartın",66.56901,66.08877],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Bilecik",67.55473,63.71312],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Bitlis",76.61433,69.69928],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Burdur",67.47419,64.19487],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Bursa",66.36315,63.73986],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Çanakkale",69.89762,68.06171],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Çorum",67.3101,63.86819],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Denizli",67.18477,65.1358],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Diyarbakır",92.34353,69.86036],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Elazığ",67.27584,64.52723],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Eskişehir",65.29238,64.50952],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Gümüşhane",69.13849,65.21785],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Iğdır",72.89387,65.13129],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","İstanbul",67.48171,65.48922],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","İzmir",65.81289,64.13355],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Kahramanmaraş",69.4234,69.27134],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Kayseri",68.40794,66.55097],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Kırklareli",64.85992,62.44401],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Kocaeli",65.6996,61.68939],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Konya",65.76811,62.07706],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Kütahya",70.9714,68.54496],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Malatya",67.83662,65.05526],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Manisa",67.80538,65.17457],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Mersin",65.34468,59.73717],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Muş",66.36615,65.24007],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Ordu",71.17576,66.22312],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Osmaniye",68.62851,66.26038],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Rize",71.38012,70.52241],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Sakarya",67.39816,64.70335],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Samsun",68.627,66.84489],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Siirt",67.27734,65.81289],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Şanlıurfa",68.87464,65.54152],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Tekirdağ",66.88366,63.14632],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Trabzon",72.19273,68.2273],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Tunceli",64.7331,64.23063],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Uşak",65.95743,65.73536],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Van",78.70992,69.78433],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Yalova",76.17018,67.43241],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Zonguldak",68.8566,68.40192],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Adana",74.16567,70.93715],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Afyonkarahisar",76.57857,75.00083],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Ağrı",73.40654,66.68381],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Ankara",76.9248,73.25147],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Antalya",75.68844,71.4991],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Artvin",66.28862,null],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Aydın",73.4844,70.38689],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Balıkesir",76.04754,73.30828],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Bayburt",84.00395,70.06472],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Bilecik",75.28723,70.98761],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Burdur",73.60639,71.91534],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Bursa",74.83406,68.15729],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Çanakkale",73.88678,71.12647],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Çorum",75.32868,75.25899],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Düzce",70.16899,68.70454],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Edirne",68.76135,65.98417],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Elazığ",77.44682,71.09522],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Erzurum",84.15,79.39302],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Eskişehir",84.35586,77.51533],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Gümüşhane",77.53756,68.9104],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Hakkâri",76.358,75.71969],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Hatay",78.47398,65.6488],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Iğdır",77.99374,70.29432],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Isparta",64.82567,64.14257],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","İstanbul",74.15664,71.66352],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","İzmir",71.43661,68.14526],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Kahramanmaraş",80.26093,75.85253],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Karaman",68.43016,67.63226],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Kars",73.53637,70.02144],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Kastamonu",76.55033,71.24728],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Kayseri",78.5963,75.2854],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Kırşehir",76.48901,66.76435],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Kocaeli",75.3128,72.48515],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Konya",75.73924,72.66996],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Kütahya",70.16749,65.14633],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Malatya",79.15106,76.15364],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Manisa",73.714,71.54121],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Mersin",73.32031,71.72719],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Muğla",70.09597,70.06322],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Muş",83.08975,78.18189],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Nevşehir",75.46001,72.10617],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Niğde",72.82804,69.69326],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Ordu",68.83136,67.56074],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Osmaniye",77.53004,73.35123],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Rize",71.24728,67.26231],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Sakarya",69.89612,65.69508],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Samsun",82.97496,73.8958],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Siirt",84.17824,80.96292],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Şanlıurfa",81.30313,76.4581],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Şırnak",75.02038,72.02112],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Tokat",71.20701,68.86111],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Trabzon",71.29056,69.94391],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Tunceli",70.53444,65.16705],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Van",80.5816,77.76748],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Yalova",73.19499,71.49041],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Zonguldak",74.48482,71.01919],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Adana",69.7098,66.05151],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Adıyaman",72.27477,67.41169],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Afyonkarahisar",72.60713,68.2781],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Amasya",76.32826,71.37261],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Ankara",79.35994,73.6764],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Antalya",70.89988,68.02896],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Artvin",71.75276,70.86713],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Aydın",70.69402,66.60628],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Balıkesir",71.68274,69.22204],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Batman",79.2677,64.66459],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Bayburt",80.00878,64.81665],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Bilecik",66.43918,66.13957],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Bingöl",73.91502,61.96076],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Bitlis",71.76328,66.60477],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Bolu",67.58447,66.72709],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Burdur",69.94658,68.36884],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Bursa",63.22687,null],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Çanakkale",71.85285,59.92349],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Çorum",72.93832,70.88033],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Diyarbakır",72.24052,65.61454],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Düzce",71.71817,67.3131],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Edirne",70.73696,64.33189],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Elazığ",83.43565,76.08363],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Erzincan",76.88152,75.90751],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Erzurum",70.59693,67.92886],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Eskişehir",74.24019,65.55472],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Gaziantep",73.45315,64.85692],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Giresun",67.12679,64.5675],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Gümüşhane",76.27295,65.69508],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Hatay",70.13925,64.19036],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Iğdır",70.64472,61.5268],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","İstanbul",70.61348,67.91265],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","İzmir",71.11895,68.627],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Kahramanmaraş",83.0423,73.32181],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Karaman",61.67285,null],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Kastamonu",75.28122,70.26725],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Kayseri",79.2824,71.82428],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Kırklareli",69.55173,69.41888],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Kırşehir",70.33459,69.37711],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Kocaeli",62.23062,null],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Konya",70.94767,64.72858],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Kütahya",68.47344,67.58147],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Malatya",68.28261,60.91973],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Manisa",71.05044,68.66427],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Mardin",72.65944,68.65975],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Mersin",82.11306,75.96248],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Muğla",58.34724,55.72696],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Muş",78.61434,63.46398],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Nevşehir",72.42683,67.51596],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Niğde",75.49911,67.97665],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Ordu",77.66288,71.45615],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Osmaniye",67.04625,60.06084],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Rize",69.89913,65.72182],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Sakarya",76.18339,70.03615],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Samsun",75.37379,70.38538],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Siirt",70.18553,66.2811],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Sinop",69.91985,68.07073],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Şanlıurfa",63.08383,null],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Şırnak",68.50018,64.99845],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Tokat",71.40385,69.07149],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Trabzon",70.77305,60.76166],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Uşak",73.91986,68.57771],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Van",72.43586,71.0354],["Destek Personeli (Bakım-Onarım) - (Havuz Suyu Operatörü)","Zonguldak",71.36809,69.4366],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Adana",67.19079,66.28561],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Adıyaman",66.72859,66.60477],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Afyonkarahisar",67.67705,65.29538],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Amasya",71.0369,70.3391],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Ankara",73.05195,69.27134],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Antalya",68.5239,67.36691],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Artvin",67.28186,64.45421],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Aydın",69.50845,68.3959],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Balıkesir",69.02971,68.35864],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Batman",70.26608,67.3639],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Bayburt",70.46141,70.30785],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Bilecik",72.29098,70.41362],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Çanakkale",71.09071,70.48514],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Denizli",68.2796,66.87313],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Diyarbakır",66.84188,66.5005],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Düzce",68.68799,67.55323],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Erzurum",72.5702,71.81525],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Eskişehir",68.5615,65.98149],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Giresun",71.14752,70.00941],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Iğdır",67.43843,66.56901],["Destek Personeli (Bakım-Onarım) - (Marangoz)","İzmir",70.69101,69.66953],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Kahramanmaraş",68.66727,68.00673],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Kastamonu",76.6937,68.77756],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Kayseri",70.41362,69.15052],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Kocaeli",70.97291,70.53895],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Konya",68.4584,67.83061],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Malatya",70.46743,68.22429],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Mardin",84.08031,67.2461],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Mersin",68.47344,67.79786],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Muğla",68.14977,64.41995],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Ordu",68.67028,67.79034],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Osmaniye",68.35413,66.1648],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Rize",71.72,68.15879],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Samsun",71.35606,69.25931],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Siirt",68.36165,67.40267],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Sinop",74.14344,68.43618],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Trabzon",68.28111,67.48772],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Van",75.64098,74.69671],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Yalova",67.32513,66.68531],["Destek Personeli (Bakım-Onarım) - (Marangoz)","Zonguldak",69.86186,69.09672]],"hata":[],"kaynak":"https://pgm.gsb.gov.tr/Public/Edit/images/PGM/012014/2026 Merkezi Yerleştirme/GSB - 2026 Yılı Sözleşmeli KGG - Destek Personeli Alımı Yerleştirme İstatistikleri.pdf"},
{"kurum":"GENÇLİK VE SPOR BAKANLIĞI","yil":2025,"kpssYil":2024,"satirlar":[["Koruma ve Güvenlik Görevlisi - 1. Grup","Adana",80.67915,80.2524],["Koruma ve Güvenlik Görevlisi - 1. Grup","Adıyaman",81.25046,80.14447],["Koruma ve Güvenlik Görevlisi - 1. Grup","Afyonkarahisar",76.48639,75.2728],["Koruma ve Güvenlik Görevlisi - 1. Grup","Amasya",78.39341,77.85709],["Koruma ve Güvenlik Görevlisi - 1. Grup","Ankara",82.46,77.05898],["Koruma ve Güvenlik Görevlisi - 1. Grup","Antalya",82.32423,78.35113],["Koruma ve Güvenlik Görevlisi - 1. Grup","Aydın",78.72742,76.51422],["Koruma ve Güvenlik Görevlisi - 1. Grup","Balıkesir",79.08359,77.86115],["Koruma ve Güvenlik Görevlisi - 1. Grup","Bilecik",83.49791,80.36041],["Koruma ve Güvenlik Görevlisi - 1. Grup","Bolu",81.5176,77.13956],["Koruma ve Güvenlik Görevlisi - 1. Grup","Burdur",79.97965,79.48812],["Koruma ve Güvenlik Görevlisi - 1. Grup","Bursa",79.29508,77.7959],["Koruma ve Güvenlik Görevlisi - 1. Grup","Çanakkale",79.84747,79.09163],["Koruma ve Güvenlik Görevlisi - 1. Grup","Çorum",82.71384,76.69187],["Koruma ve Güvenlik Görevlisi - 1. Grup","Denizli",85.22194,78.77011],["Koruma ve Güvenlik Görevlisi - 1. Grup","Diyarbakır",81.07477,80.75846],["Koruma ve Güvenlik Görevlisi - 1. Grup","Düzce",79.45469,75.98878],["Koruma ve Güvenlik Görevlisi - 1. Grup","Edirne",77.23622,74.06366],["Koruma ve Güvenlik Görevlisi - 1. Grup","Elazığ",74.88116,73.91256],["Koruma ve Güvenlik Görevlisi - 1. Grup","Erzurum",78.44779,77.62467],["Koruma ve Güvenlik Görevlisi - 1. Grup","Giresun",81.60825,80.58567],["Koruma ve Güvenlik Görevlisi - 1. Grup","Gümüşhane",81.72908,79.96878],["Koruma ve Güvenlik Görevlisi - 1. Grup","Hatay",79.39504,78.03319],["Koruma ve Güvenlik Görevlisi - 1. Grup","Isparta",78.85718,77.30991],["Koruma ve Güvenlik Görevlisi - 1. Grup","İstanbul",80.37371,78.78747],["Koruma ve Güvenlik Görevlisi - 1. Grup","İzmir",82.05709,77.33611],["Koruma ve Güvenlik Görevlisi - 1. Grup","Kahramanmaraş",75.44646,72.78002],["Koruma ve Güvenlik Görevlisi - 1. Grup","Kastamonu",80.9132,80.29516],["Koruma ve Güvenlik Görevlisi - 1. Grup","Kayseri",82.1272,81.72908],["Koruma ve Güvenlik Görevlisi - 1. Grup","Kırıkkale",77.71126,77.20521],["Koruma ve Güvenlik Görevlisi - 1. Grup","Kocaeli",77.2918,76.27686],["Koruma ve Güvenlik Görevlisi - 1. Grup","Konya",81.2585,78.3543],["Koruma ve Güvenlik Görevlisi - 1. Grup","Malatya",80.61668,79.93088],["Koruma ve Güvenlik Görevlisi - 1. Grup","Manisa",78.0646,77.3938],["Koruma ve Güvenlik Görevlisi - 1. Grup","Mersin",86.68377,83.06514],["Koruma ve Güvenlik Görevlisi - 1. Grup","Muğla",89.80553,82.4983],["Koruma ve Güvenlik Görevlisi - 1. Grup","Rize",79.24435,77.82285],["Koruma ve Güvenlik Görevlisi - 1. Grup","Sakarya",79.65732,76.19628],["Koruma ve Güvenlik Görevlisi - 1. Grup","Samsun",78.60895,77.02588],["Koruma ve Güvenlik Görevlisi - 1. Grup","Tokat",82.81333,75.38526],["Koruma ve Güvenlik Görevlisi - 1. Grup","Trabzon",78.1597,76.49889],["Koruma ve Güvenlik Görevlisi - 1. Grup","Zonguldak",80.95589,79.39302],["Koruma ve Güvenlik Görevlisi - 2. Grup","Adana",76.74266,76.12219],["Koruma ve Güvenlik Görevlisi - 2. Grup","Afyonkarahisar",80.00262,76.58028],["Koruma ve Güvenlik Görevlisi - 2. Grup","Ağrı",78.56667,76.70922],["Koruma ve Güvenlik Görevlisi - 2. Grup","Amasya",85.80858,82.46804],["Koruma ve Güvenlik Görevlisi - 2. Grup","Ankara",81.6739,78.37402],["Koruma ve Güvenlik Görevlisi - 2. Grup","Antalya",79.31243,76.61371],["Koruma ve Güvenlik Görevlisi - 2. Grup","Aydın",78.02029,75.3929],["Koruma ve Güvenlik Görevlisi - 2. Grup","Balıkesir",83.17355,78.46312],["Koruma ve Güvenlik Görevlisi - 2. Grup","Bilecik",79.42443,78.02029],["Koruma ve Güvenlik Görevlisi - 2. Grup","Bingöl",77.9651,76.79298],["Koruma ve Güvenlik Görevlisi - 2. Grup","Burdur",80.27497,79.70286],["Koruma ve Güvenlik Görevlisi - 2. Grup","Bursa",75.51819,73.803],["Koruma ve Güvenlik Görevlisi - 2. Grup","Çankırı",79.87773,77.30187],["Koruma ve Güvenlik Görevlisi - 2. Grup","Çorum",83.0696,77.30187],["Koruma ve Güvenlik Görevlisi - 2. Grup","Denizli",80.9386,74.91062],["Koruma ve Güvenlik Görevlisi - 2. Grup","Erzincan",79.93008,76.51179],["Koruma ve Güvenlik Görevlisi - 2. Grup","Eskişehir",78.27656,76.62459],["Koruma ve Güvenlik Görevlisi - 2. Grup","Gaziantep",77.40785,75.80222],["Koruma ve Güvenlik Görevlisi - 2. Grup","Giresun",80.82944,78.75518],["Koruma ve Güvenlik Görevlisi - 2. Grup","İstanbul",77.69107,76.39291],["Koruma ve Güvenlik Görevlisi - 2. Grup","İzmir",76.62864,74.90055],["Koruma ve Güvenlik Görevlisi - 2. Grup","Kahramanmaraş",77.3809,75.77885],["Koruma ve Güvenlik Görevlisi - 2. Grup","Kars",74.99518,73.29898],["Koruma ve Güvenlik Görevlisi - 2. Grup","Kocaeli",75.92914,75.62012],["Koruma ve Güvenlik Görevlisi - 2. Grup","Konya",79.04692,77.42075],["Koruma ve Güvenlik Görevlisi - 2. Grup","Malatya",78.47116,75.77885],["Koruma ve Güvenlik Görevlisi - 2. Grup","Manisa",89.46179,77.24669],["Koruma ve Güvenlik Görevlisi - 2. Grup","Mardin",88.4199,77.7068],["Koruma ve Güvenlik Görevlisi - 2. Grup","Mersin",81.98495,81.52564],["Koruma ve Güvenlik Görevlisi - 2. Grup","Muğla",80.19519,78.47318],["Koruma ve Güvenlik Görevlisi - 2. Grup","Muş",77.39177,77.09039],["Koruma ve Güvenlik Görevlisi - 2. Grup","Nevşehir",82.60989,78.31641],["Koruma ve Güvenlik Görevlisi - 2. Grup","Osmaniye",82.50836,80.32008],["Koruma ve Güvenlik Görevlisi - 2. Grup","Rize",75.09718,72.54915],["Koruma ve Güvenlik Görevlisi - 2. Grup","Sakarya",78.85833,75.739],["Koruma ve Güvenlik Görevlisi - 2. Grup","Samsun",83.52486,79.99255],["Koruma ve Güvenlik Görevlisi - 2. Grup","Sinop",80.42208,79.95831],["Koruma ve Güvenlik Görevlisi - 2. Grup","Şanlıurfa",79.62794,75.20268],["Koruma ve Güvenlik Görevlisi - 2. Grup","Tekirdağ",79.06468,76.43803],["Koruma ve Güvenlik Görevlisi - 2. Grup","Trabzon",78.18793,74.01854],["Koruma ve Güvenlik Görevlisi - 2. Grup","Van",80.15088,77.39981],["Koruma ve Güvenlik Görevlisi - 2. Grup","Yalova",76.79095,75.86794],["Koruma ve Güvenlik Görevlisi - 3. Grup","Adana",80.65097,78.1316],["Koruma ve Güvenlik Görevlisi - 3. Grup","Adıyaman",84.42258,81.93051],["Koruma ve Güvenlik Görevlisi - 3. Grup","Afyonkarahisar",76.80624,73.98308],["Koruma ve Güvenlik Görevlisi - 3. Grup","Aksaray",73.87889,71.44241],["Koruma ve Güvenlik Görevlisi - 3. Grup","Amasya",72.77455,71.51054],["Koruma ve Güvenlik Görevlisi - 3. Grup","Ankara",81.13784,79.15806],["Koruma ve Güvenlik Görevlisi - 3. Grup","Antalya",80.74151,77.26681],["Koruma ve Güvenlik Görevlisi - 3. Grup","Ardahan",74.67744,71.91863],["Koruma ve Güvenlik Görevlisi - 3. Grup","Artvin",80.64797,74.6609],["Koruma ve Güvenlik Görevlisi - 3. Grup","Aydın",75.75548,73.86912],["Koruma ve Güvenlik Görevlisi - 3. Grup","Balıkesir",79.63616,76.45273],["Koruma ve Güvenlik Görevlisi - 3. Grup","Bayburt",76.64358,73.98796],["Koruma ve Güvenlik Görevlisi - 3. Grup","Bilecik",81.03265,76.59298],["Koruma ve Güvenlik Görevlisi - 3. Grup","Bolu",77.21622,75.14489],["Koruma ve Güvenlik Görevlisi - 3. Grup","Burdur",74.32881,72.2049],["Koruma ve Güvenlik Görevlisi - 3. Grup","Bursa",78.53382,75.65807],["Koruma ve Güvenlik Görevlisi - 3. Grup","Çanakkale",78.4374,75.34362],["Koruma ve Güvenlik Görevlisi - 3. Grup","Çankırı",81.66466,77.43047],["Koruma ve Güvenlik Görevlisi - 3. Grup","Çorum",80.48342,78.37604],["Koruma ve Güvenlik Görevlisi - 3. Grup","Denizli",81.65301,78.86103],["Koruma ve Güvenlik Görevlisi - 3. Grup","Diyarbakır",84.88615,83.03973],["Koruma ve Güvenlik Görevlisi - 3. Grup","Düzce",80.09585,76.62804],["Koruma ve Güvenlik Görevlisi - 3. Grup","Edirne",74.76609,73.4952],["Koruma ve Güvenlik Görevlisi - 3. Grup","Elazığ",83.24423,78.10053],["Koruma ve Güvenlik Görevlisi - 3. Grup","Erzincan",75.65618,73.65298],["Koruma ve Güvenlik Görevlisi - 3. Grup","Erzurum",81.76596,79.48915],["Koruma ve Güvenlik Görevlisi - 3. Grup","Eskişehir",77.44512,72.26337],["Koruma ve Güvenlik Görevlisi - 3. Grup","Gaziantep",82.63952,76.91042],["Koruma ve Güvenlik Görevlisi - 3. Grup","Giresun",78.82008,76.00769],["Koruma ve Güvenlik Görevlisi - 3. Grup","Gümüşhane",73.96754,69.70506],["Koruma ve Güvenlik Görevlisi - 3. Grup","Hakkâri",82.28213,81.11543],["Koruma ve Güvenlik Görevlisi - 3. Grup","Hatay",79.54662,78.35662],["Koruma ve Güvenlik Görevlisi - 3. Grup","Iğdır",80.45224,78.23879],["Koruma ve Güvenlik Görevlisi - 3. Grup","Isparta",80.02573,73.81076],["Koruma ve Güvenlik Görevlisi - 3. Grup","İstanbul",80.20881,78.15302],["Koruma ve Güvenlik Görevlisi - 3. Grup","İzmir",79.26812,76.86759],["Koruma ve Güvenlik Görevlisi - 3. Grup","Kahramanmaraş",78.99151,75.94932],["Koruma ve Güvenlik Görevlisi - 3. Grup","Karabük",76.64069,72.98492],["Koruma ve Güvenlik Görevlisi - 3. Grup","Karaman",81.32092,72.69865],["Koruma ve Güvenlik Görevlisi - 3. Grup","Kars",83.69704,77.41782],["Koruma ve Güvenlik Görevlisi - 3. Grup","Kastamonu",79.60598,75.55687],["Koruma ve Güvenlik Görevlisi - 3. Grup","Kayseri",78.70336,76.00869],["Koruma ve Güvenlik Görevlisi - 3. Grup","Kırıkkale",78.96521,76.71081],["Koruma ve Güvenlik Görevlisi - 3. Grup","Kırklareli",74.30063,71.31481],["Koruma ve Güvenlik Görevlisi - 3. Grup","Kırşehir",75.56952,72.25849],["Koruma ve Güvenlik Görevlisi - 3. Grup","Kocaeli",75.31821,72.63829],["Koruma ve Güvenlik Görevlisi - 3. Grup","Konya",80.51849,78.69448],["Koruma ve Güvenlik Görevlisi - 3. Grup","Malatya",82.8966,81.44164],["Koruma ve Güvenlik Görevlisi - 3. Grup","Manisa",78.63312,75.67759],["Koruma ve Güvenlik Görevlisi - 3. Grup","Mardin",84.03401,82.47197],["Koruma ve Güvenlik Görevlisi - 3. Grup","Mersin",81.51664,79.67611],["Koruma ve Güvenlik Görevlisi - 3. Grup","Muğla",77.46942,73.13393],["Koruma ve Güvenlik Görevlisi - 3. Grup","Muş",82.0104,80.46489],["Koruma ve Güvenlik Görevlisi - 3. Grup","Nevşehir",77.78398,73.02874],["Koruma ve Güvenlik Görevlisi - 3. Grup","Niğde",78.11995,74.14185],["Koruma ve Güvenlik Görevlisi - 3. Grup","Ordu",75.32797,70.45202],["Koruma ve Güvenlik Görevlisi - 3. Grup","Osmaniye",80.10751,76.29007],["Koruma ve Güvenlik Görevlisi - 3. Grup","Rize",78.70036,75.32797],["Koruma ve Güvenlik Görevlisi - 3. Grup","Sakarya",81.48458,74.84398],["Koruma ve Güvenlik Görevlisi - 3. Grup","Samsun",80.44159,78.64977],["Koruma ve Güvenlik Görevlisi - 3. Grup","Siirt",82.07952,79.40926],["Koruma ve Güvenlik Görevlisi - 3. Grup","Sinop",76.57545,74.73591],["Koruma ve Güvenlik Görevlisi - 3. Grup","Sivas",84.80238,82.31131],["Koruma ve Güvenlik Görevlisi - 3. Grup","Şanlıurfa",86.20952,85.9622],["Koruma ve Güvenlik Görevlisi - 3. Grup","Şırnak",82.04058,78.97598],["Koruma ve Güvenlik Görevlisi - 3. Grup","Tokat",80.87199,78.87467],["Koruma ve Güvenlik Görevlisi - 3. Grup","Trabzon",78.50364,75.20037],["Koruma ve Güvenlik Görevlisi - 3. Grup","Tunceli",75.61135,73.63834],["Koruma ve Güvenlik Görevlisi - 3. Grup","Yalova",74.04932,70.37313],["Koruma ve Güvenlik Görevlisi - 3. Grup","Yozgat",78.81332,77.6272],["Koruma ve Güvenlik Görevlisi - 3. Grup","Zonguldak",81.46117,79.196],["Koruma ve Güvenlik Görevlisi - 4. Grup","Adana",81.89744,80.47566],["Koruma ve Güvenlik Görevlisi - 4. Grup","Afyonkarahisar",83.46436,79.96826],["Koruma ve Güvenlik Görevlisi - 4. Grup","Ağrı",83.06991,79.78618],["Koruma ve Güvenlik Görevlisi - 4. Grup","Aksaray",77.77621,74.78462],["Koruma ve Güvenlik Görevlisi - 4. Grup","Amasya",82.6171,78.37604],["Koruma ve Güvenlik Görevlisi - 4. Grup","Ankara",82.76612,81.65301],["Koruma ve Güvenlik Görevlisi - 4. Grup","Antalya",81.03953,79.10058],["Koruma ve Güvenlik Görevlisi - 4. Grup","Ardahan",79.75888,77.71874],["Koruma ve Güvenlik Görevlisi - 4. Grup","Artvin",80.72298,80.00043],["Koruma ve Güvenlik Görevlisi - 4. Grup","Aydın",81.93739,79.69852],["Koruma ve Güvenlik Görevlisi - 4. Grup","Balıkesir",82.3639,78.72954],["Koruma ve Güvenlik Görevlisi - 4. Grup","Bilecik",78.48222,74.39794],["Koruma ve Güvenlik Görevlisi - 4. Grup","Bingöl",82.89172,80.75027],["Koruma ve Güvenlik Görevlisi - 4. Grup","Burdur",82.16329,80.313],["Koruma ve Güvenlik Görevlisi - 4. Grup","Bursa",80.74151,76.86371],["Koruma ve Güvenlik Görevlisi - 4. Grup","Çanakkale",80.58473,76.4099],["Koruma ve Güvenlik Görevlisi - 4. Grup","Çankırı",81.78738,80.24875],["Koruma ve Güvenlik Görevlisi - 4. Grup","Çorum",83.961,80.74639],["Koruma ve Güvenlik Görevlisi - 4. Grup","Denizli",81.40857,78.35363],["Koruma ve Güvenlik Görevlisi - 4. Grup","Düzce",79.57392,78.9438],["Koruma ve Güvenlik Görevlisi - 4. Grup","Edirne",79.5018,77.50936],["Koruma ve Güvenlik Görevlisi - 4. Grup","Elazığ",81.13884,77.59702],["Koruma ve Güvenlik Görevlisi - 4. Grup","Erzincan",82.48174,78.95157],["Koruma ve Güvenlik Görevlisi - 4. Grup","Erzurum",79.06064,77.20068],["Koruma ve Güvenlik Görevlisi - 4. Grup","Eskişehir",82.24218,79.8836],["Koruma ve Güvenlik Görevlisi - 4. Grup","Gaziantep",79.55339,78.43939],["Koruma ve Güvenlik Görevlisi - 4. Grup","Giresun",80.25164,77.69344],["Koruma ve Güvenlik Görevlisi - 4. Grup","Gümüşhane",78.92827,76.47126],["Koruma ve Güvenlik Görevlisi - 4. Grup","Hakkâri",79.48915,77.46065],["Koruma ve Güvenlik Görevlisi - 4. Grup","Hatay",78.30791,74.13797],["Koruma ve Güvenlik Görevlisi - 4. Grup","Iğdır",84.37387,80.33152],["Koruma ve Güvenlik Görevlisi - 4. Grup","Isparta",81.71925,73.246],["Koruma ve Güvenlik Görevlisi - 4. Grup","İstanbul",81.27809,79.67999],["Koruma ve Güvenlik Görevlisi - 4. Grup","İzmir",81.01901,77.69144],["Koruma ve Güvenlik Görevlisi - 4. Grup","Kahramanmaraş",80.57885,77.05456],["Koruma ve Güvenlik Görevlisi - 4. Grup","Karabük",84.74102,82.18471],["Koruma ve Güvenlik Görevlisi - 4. Grup","Karaman",80.13968,78.84838],["Koruma ve Güvenlik Görevlisi - 4. Grup","Kars",81.65689,80.12992],["Koruma ve Güvenlik Görevlisi - 4. Grup","Kastamonu",79.12788,77.05555],["Koruma ve Güvenlik Görevlisi - 4. Grup","Kayseri",79.42391,76.0564],["Koruma ve Güvenlik Görevlisi - 4. Grup","Kocaeli",81.6043,77.40518],["Koruma ve Güvenlik Görevlisi - 4. Grup","Konya",82.8956,80.63632],["Koruma ve Güvenlik Görevlisi - 4. Grup","Kütahya",76.01845,74.86051],["Koruma ve Güvenlik Görevlisi - 4. Grup","Malatya",83.01832,80.28481],["Koruma ve Güvenlik Görevlisi - 4. Grup","Manisa",80.5146,77.50936],["Koruma ve Güvenlik Görevlisi - 4. Grup","Mardin",84.57059,81.7309],["Koruma ve Güvenlik Görevlisi - 4. Grup","Mersin",83.57044,81.94516],["Koruma ve Güvenlik Görevlisi - 4. Grup","Muğla",81.56535,79.37719],["Koruma ve Güvenlik Görevlisi - 4. Grup","Muş",80.47077,79.11811],["Koruma ve Güvenlik Görevlisi - 4. Grup","Nevşehir",80.88076,78.17643],["Koruma ve Güvenlik Görevlisi - 4. Grup","Ordu",81.02001,76.32036],["Koruma ve Güvenlik Görevlisi - 4. Grup","Osmaniye",82.15841,77.6009],["Koruma ve Güvenlik Görevlisi - 4. Grup","Rize",79.24083,77.67391],["Koruma ve Güvenlik Görevlisi - 4. Grup","Sakarya",81.0463,77.42559],["Koruma ve Güvenlik Görevlisi - 4. Grup","Samsun",84.29209,81.50111],["Koruma ve Güvenlik Görevlisi - 4. Grup","Siirt",84.81114,82.41749],["Koruma ve Güvenlik Görevlisi - 4. Grup","Sinop",81.04142,79.53397],["Koruma ve Güvenlik Görevlisi - 4. Grup","Sivas",82.25383,79.93031],["Koruma ve Güvenlik Görevlisi - 4. Grup","Şanlıurfa",85.37891,79.73747],["Koruma ve Güvenlik Görevlisi - 4. Grup","Şırnak",80.12992,78.00212],["Koruma ve Güvenlik Görevlisi - 4. Grup","Tekirdağ",79.88548,78.39168],["Koruma ve Güvenlik Görevlisi - 4. Grup","Tokat",80.69768,78.1589],["Koruma ve Güvenlik Görevlisi - 4. Grup","Trabzon",82.84301,80.54378],["Koruma ve Güvenlik Görevlisi - 4. Grup","Tunceli",77.94853,77.85799],["Koruma ve Güvenlik Görevlisi - 4. Grup","Uşak",80.17863,79.7297],["Koruma ve Güvenlik Görevlisi - 4. Grup","Van",83.81199,81.84873],["Koruma ve Güvenlik Görevlisi - 4. Grup","Yalova",76.3846,73.95101],["Koruma ve Güvenlik Görevlisi - 4. Grup","Yozgat",77.04579,75.81973],["Koruma ve Güvenlik Görevlisi - 4. Grup","Zonguldak",82.07275,79.41126],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Adana",79.63765,75.90483],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Afyonkarahisar",76.97259,75.47355],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Amasya",74.26275,73.17694],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Ankara",80.38926,76.50438],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Antalya",76.62336,73.24578],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Ardahan",76.23569,69.95143],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Artvin",72.10918,70.48966],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Aydın",77.17361,72.48482],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Balıkesir",77.75395,75.71367],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Bayburt",72.4016,69.02971],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Bilecik",78.50706,76.17169],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Bolu",74.294,73.56344],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Burdur",74.77006,73.19799],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Çanakkale",77.64517,73.94509],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Çankırı",69.79035,68.66727],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Çorum",73.00115,70.58072],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Denizli",73.75878,72.62067],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Edirne",70.96087,70.06171],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Erzurum",75.88528,74.65643],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Eskişehir",78.82439,75.74943],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Gaziantep",78.80249,77.33353],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Gümüşhane",73.3407,71.87808],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Hakkâri",80.87703,76.42083],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Iğdır",71.01769,68.15729],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Isparta",76.25524,73.42308],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","İstanbul",75.34405,73.3158],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","İzmir",75.29325,73.29775],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Karabük",78.52478,71.98085],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Kastamonu",76.92781,72.43736],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Kayseri",79.93576,78.03551],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Kırklareli",73.11445,70.84006],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Kocaeli",76.30453,72.17501],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Konya",79.10812,77.95229],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Manisa",75.82579,73.201],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Mardin",79.66707,72.32557],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Mersin",77.99975,75.85854],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Muğla",75.46035,72.54915],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Niğde",77.71368,76.61166],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Osmaniye",80.11606,73.3798],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Rize",75.37981,73.55592],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Sakarya",74.99665,72.69971],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Samsun",77.18865,74.84425],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Siirt",79.46153,76.1122],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Şırnak",75.00985,73.63045],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Tekirdağ",73.99288,72.8506],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Trabzon",77.73741,75.46302],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Tunceli",77.6064,73.38431],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Van",78.31139,76.03133],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Yalova",72.99213,71.69778],["Destek Personeli (Bakım-Onarım) - (Elektrik Tesisatçısı)","Yozgat",76.18522,73.14419],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Adana",70.77305,66.01124],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Afyonkarahisar",81.60876,64.93896],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Ankara",72.35381,68.41813],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Antalya",67.48171,65.08651],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Ardahan",66.84038,65.36841],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Aydın",68.31236,66.54946],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Balıkesir",69.89913,66.36615],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Bayburt",80.00878,61.72515],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Bilecik",64.70034,61.1271],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Bolu",70.5194,67.77981],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Burdur",65.69208,62.91974],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Bursa",65.73987,58.42628],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Çanakkale",63.26714,61.64611],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Çankırı",66.05451,63.31192],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Çorum",79.64785,68.51521],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Diyarbakır",74.37755,70.0542],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Edirne",68.35413,67.84715],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Erzurum",70.78659,65.17307],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Eskişehir",68.88785,67.67554],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Gaziantep",66.06053,63.70861],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Gümüşhane",56.67843,null],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Hakkâri",63.06428,null],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Iğdır",65.04624,61.409],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","İstanbul",66.92092,63.51929],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","İzmir",68.36165,65.37593],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Kahramanmaraş",65.92919,62.51553],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Karabük",59.38376,null],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Kastamonu",64.43048,null],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Kayseri",69.1415,66.41846],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Kırklareli",65.06128,64.2826],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Kocaeli",66.69133,58.90502],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Konya",71.85886,68.80764],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Manisa",62.957,61.90545],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Mardin",66.52239,57.90126],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Mersin",68.8596,64.09478],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Muğla",66.36014,63.59833],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Muş",71.21453,64.43649],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Nevşehir",69.06397,67.079],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Niğde",73.23827,72.6327],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Osmaniye",68.35413,64.69884],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Rize",71.6022,59.34349],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Sakarya",67.46667,65.06128],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Samsun",74.50738,69.35489],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Siirt",76.09867,69.07149],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Sinop",70.38689,60.69164],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Şanlıurfa",72.66996,66.76886],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Tekirdağ",67.28035,64.70034],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Trabzon",71.76629,65.52197],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Tunceli",72.52091,null],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Uşak",68.5732,65.41018],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Van",74.79078,65.17307],["Destek Personeli (Bakım-Onarım) - (İklimlendirme Personeli)","Yozgat",66.39289,62.58404],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Adana",69.02219,66.65256],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Afyonkarahisar",69.95895,69.31161],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Amasya",69.82159,69.66653],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Ankara",71.23224,69.0775],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Antalya",68.28712,67.0165],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Ardahan",null,null],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Artvin",67.88592,65.25361],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Aydın",65.5325,64.70937],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Balıkesir",67.54871,66.71656],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Bayburt",75.53036,61.05257],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Bilecik",69.89311,66.42297],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Bolu",64.62431,64.06203],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Burdur",69.45615,68.20207],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Bursa",66.60327,64.70486],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Çanakkale",69.90063,63.74437],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Denizli",67.8769,67.49674],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Edirne",63.11207,62.28593],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Erzurum",71.38012,66.36615],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Eskişehir",69.89462,66.41394],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Gaziantep",71.42491,66.37217],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Gümüşhane",68.31687,62.23062],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Iğdır",72.89387,68.28261],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Isparta",69.27134,68.51371],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","İstanbul",67.09404,64.68681],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","İzmir",65.60552,64.09327],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Karabük",66.60176,63.11959],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Kastamonu",68.42264,67.23858],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Kayseri",68.63001,66.04248],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Kırklareli",65.8829,64.3872],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Kocaeli",66.45121,63.71312],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Konya",73.50813,68.95669],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Manisa",68.28712,64.90922],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Mardin",71.88109,68.09596],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Mersin",67.80538,65.534],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Muğla",66.51821,65.53099],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Nevşehir",62.54377,61.91898],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Niğde",71.61273,68.08577],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Osmaniye",65.6996,63.75339],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Rize",67.03422,63.94121],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Sakarya",63.71914,60.79741],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Samsun",68.67179,68.06321],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Siirt",74.27595,63.62356],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Sinop",66.09479,63.71613],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Şırnak",68.47193,68.1633],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Tekirdağ",63.70861,62.04882],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Trabzon",68.03497,65.76961],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Tunceli",67.079,65.71012],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Uşak",67.48171,65.95743],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Van",69.04893,66.91791],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Yalova",null,null],["Destek Personeli (Bakım-Onarım) - (Sıhhi Tesisatçı)","Yozgat",67.77413,67.00898]],"hata":[],"kaynak":"https://pgm.gsb.gov.tr/Public/Edit/images/PGM/012014/GSB - 2025 Yılı Sözleşmeli KGG - Bakım-Onarım Alımı Yerleştirme İstatistikleri.pdf"},
{"kurum":"GENÇLİK VE SPOR BAKANLIĞI","yil":2025,"kpssYil":2024,"satirlar":[["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Adana",79.77919,77.76447],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Adıyaman",82.03703,79.41525],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Afyonkarahisar",78.84544,77.0528],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Ağrı",85.65773,79.50631],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Amasya",78.77242,76.8725],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Ankara",82.16052,79.87326],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Antalya",79.75997,76.0076],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Ardahan",78.88604,74.09749],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Artvin",79.93392,76.34029],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Aydın",78.74234,76.66847],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Balıkesir",77.28273,75.28573],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Bartın",77.39001,75.83632],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Bayburt",80.37991,77.00083],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Bilecik",77.35391,73.8958],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Bolu",78.62153,77.86089],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Burdur",80.74686,76.2534],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Bursa",78.72195,77.03358],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Çanakkale",77.14537,73.63345],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Çankırı",77.18715,75.77349],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Çorum",81.52403,78.16535],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Denizli",80.22066,77.08438],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Diyarbakır",86.27951,83.9595],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Düzce",76.00459,73.23676],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Edirne",77.40922,75.65418],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Elazığ",81.13937,78.61467],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Erzincan",81.94596,80.20228],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Erzurum",81.54058,78.67115],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Eskişehir",78.51308,75.53487],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Gaziantep",87.13572,81.3434],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Giresun",78.89139,76.78745],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Gümüşhane",82.70476,80.04454],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Hakkâri",82.96627,80.21765],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Hatay",79.58652,76.291],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Iğdır",76.22366,74.6444],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Isparta",80.30538,77.91654],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","İstanbul",77.24847,74.88753],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","İzmir",78.32192,75.69896],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Kahramanmaraş",82.03703,78.89473],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Karabük",81.27339,79.17212],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Karaman",83.34909,76.02264],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Kars",78.44724,76.21948],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Kastamonu",77.9015,76.58309],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Kayseri",81.12885,78.16117],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Kırıkkale",85.17899,78.6486],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Kırşehir",80.40698,78.71711],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Kocaeli",76.08212,73.75995],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Konya",80.17137,77.70465],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Kütahya",82.64711,78.45777],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Malatya",81.53155,79.11864],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Manisa",78.57741,75.81827],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Mardin",81.40021,78.35467],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Mersin",79.22442,76.60982],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Muğla",77.08889,74.05538],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Muş",87.54712,84.63475],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Nevşehir",79.30162,75.31999],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Niğde",81.37348,78.1981],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Ordu",81.50716,78.04938],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Osmaniye",81.02424,75.71818],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Rize",78.07311,75.79572],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Sakarya",74.00308,72.55817],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Samsun",80.82172,78.3012],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Siirt",84.34834,83.60425],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Şanlıurfa",83.84136,80.04905],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Şırnak",81.53155,79.67609],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Tokat",82.70509,79.20905],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Tunceli",78.27145,75.66438],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Van",85.76384,83.24215],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Yalova",76.95455,73.74374],["DESTEK PERSONELİ (TEMİZLİK) - 1. GRUP","Zonguldak",77.54357,75.77165],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Adana",78.60415,77.17996],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Adıyaman",86.07514,82.91664],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Afyonkarahisar",77.65837,75.62561],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Ağrı",79.37498,76.81602],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Amasya",78.55636,75.7897],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Ankara",78.81386,75.5454],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Antalya",75.04678,71.78551],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Ardahan",80.70993,73.47087],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Artvin",76.76222,72.92663],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Aydın",75.25448,72.98461],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Balıkesir",77.06032,74.18221],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Bartın",78.06676,72.10767],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Bilecik",73.23526,70.85961],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Bolu",77.89816,75.73773],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Burdur",76.44757,74.28197],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Bursa",76.1371,74.05538],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Çanakkale",71.86906,70.44187],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Çankırı",74.9918,72.79077],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Çorum",79.88764,77.45735],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Denizli",77.36778,74.70723],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Düzce",73.92855,72.12271],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Edirne",73.22473,71.49643],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Elazığ",83.87111,81.47441],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Erzincan",79.18532,75.29926],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Erzurum",78.4322,76.09984],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Eskişehir",76.0106,73.02338],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Gaziantep",79.33621,76.16534],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Giresun",76.85446,74.3595],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Gümüşhane",77.57214,75.96281],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Hakkâri",80.88839,79.64484],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Hatay",79.67642,76.8202],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Iğdır",74.4611,72.85026],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Isparta",82.52446,80.00427],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","İstanbul",73.04711,70.67597],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","İzmir",73.91201,70.96839],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Kahramanmaraş",79.98205,78.06977],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Karabük",75.38582,73.49159],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Karaman",75.47505,74.26576],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Kars",75.40805,73.71249],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Kastamonu",77.42727,75.18447],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Kayseri",77.323,74.78928],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Kırşehir",78.78745,74.80098],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Kilis",74.62519,71.74674],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Kocaeli",75.24813,71.67639],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Konya",77.52703,74.73246],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Kütahya",78.13711,77.19768],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Malatya",80.12358,77.03626],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Manisa",76.65611,74.47279],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Mardin",80.65579,77.77918],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Mersin",77.77016,75.09908],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Muğla",75.46603,71.82879],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Muş",88.36005,84.77328],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Nevşehir",74.50738,72.5281],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Ordu",79.96701,74.65794],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Osmaniye",78.868,75.02756],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Rize",76.48483,73.38431],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Sakarya",73.74976,70.58824],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Samsun",78.50823,76.14194],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Siirt",81.67192,79.6166],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Sinop",75.5454,73.91652],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Şanlıurfa",81.25985,77.06333],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Şırnak",78.55452,77.23494],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Tekirdağ",74.1777,71.52316],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Tokat",82.99751,80.02382],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Tunceli",77.19166,74.55818],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Van",81.58052,79.2154],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Yalova",73.02789,71.40502],["DESTEK PERSONELİ (TEMİZLİK) - 2. GRUP","Zonguldak",75.50663,72.39408]],"hata":[],"kaynak":"https://pgm.gsb.gov.tr/Public/Edit/images/PGM/012014/GSB - 2025 Yılı Sözleşmeli Destek Personeli (Temizlik) Alımı Yerleştirme İstatistikleri.pdf"}
];


/* bolucu.js */
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
      // tur: şartın konusu (uygulamadaki "seni en çok engelleyen" özeti için); verilmezse sinif/nottan çıkarılır.
      const ekle = (durum, not, sinif, cumle, alinabilir, eksik, tur) => {
        if (!tur) tur = sinif === 'okul' ? 'okul' : sinif === 'cinsiyet' ? 'cinsiyet' : sinif === 'bolum' ? 'bolum' : sinif === 'puan' ? (/puanı ister, sende/.test(not) ? 'puanTur' : /KPSS ister\.$/.test(not) ? 'kpssYil' : 'kpss') : null;
        if (!R.some(r => r.durum === durum && r.not === not && (sinif !== 'diger' || r.cumle === cumle)))
          R.push({ durum, not, sinif, tur, cumle: cumle || '', alinabilir, eksik: durum === 'bak' ? eksik || null : null });
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
        ekle(r.durum, r.not, sinif, s.cumle, r.alinabilir, r.eksik, s.tur);
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
        if (s.durum === 'yok') ekle('yok', s.not, 'ortak', s.cumle, s.alinabilir, null, s.tur);
        else if (s.kime.length) ekle(s.durum, s.not, 'diger', s.cumle, null, s.eksik, s.tur);
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


/* bolumler.js */
/* Bölüm adları (ÖSYM/YÖK'te kullanılan yaygın adlar). Seçim kolaylığı için; listede olmayan bölüm elle yazılabilir.
   L: lisans, O: ön lisans */
(function (kok) {
  'use strict';
  const L = `Acil Yardım ve Afet Yönetimi;Adalet;Ağaç İşleri Endüstri Mühendisliği;Aile ve Tüketici Bilimleri;Aktüerya Bilimleri;Alman Dili ve Edebiyatı;Almanca Öğretmenliği;Amerikan Kültürü ve Edebiyatı;Antrenörlük Eğitimi;Arap Dili ve Edebiyatı;Arapça Öğretmenliği;Arkeoloji;Astronomi ve Uzay Bilimleri;Avukatlık;Bankacılık;Bankacılık ve Finans;Bankacılık ve Sigortacılık;Beden Eğitimi ve Spor Öğretmenliği;Beslenme ve Diyetetik;Bilgi ve Belge Yönetimi;Bilgisayar Bilimleri;Bilgisayar Mühendisliği;Bilgisayar ve Öğretim Teknolojileri Öğretmenliği;Bilişim Sistemleri Mühendisliği;Biyokimya;Biyoloji;Biyoloji Öğretmenliği;Biyomedikal Mühendisliği;Biyomühendislik;Coğrafya;Coğrafya Öğretmenliği;Çalışma Ekonomisi ve Endüstri İlişkileri;Çevre Mühendisliği;Çocuk Gelişimi;Dil ve Konuşma Terapisi;Diş Hekimliği;Ebelik;Ekonometri;Ekonomi;Ekonomi ve Finans;Elektrik Mühendisliği;Elektrik-Elektronik Mühendisliği;Elektronik ve Haberleşme Mühendisliği;Endüstri Mühendisliği;Endüstri Ürünleri Tasarımı;Enerji Sistemleri Mühendisliği;Ergoterapi;Eczacılık;Felsefe;Felsefe Grubu Öğretmenliği;Fen Bilgisi Öğretmenliği;Fizik;Fizik Mühendisliği;Fizik Öğretmenliği;Fizyoterapi ve Rehabilitasyon;Fransız Dili ve Edebiyatı;Fransızca Öğretmenliği;Gastronomi ve Mutfak Sanatları;Gazetecilik;Gemi İnşaatı ve Gemi Makineleri Mühendisliği;Genetik ve Biyomühendislik;Geomatik Mühendisliği;Gıda Mühendisliği;Grafik Tasarımı;Halkla İlişkiler ve Reklamcılık;Halkla İlişkiler ve Tanıtım;Harita Mühendisliği;Havacılık ve Uzay Mühendisliği;Hemşirelik;Hukuk;İç Mimarlık;İç Mimarlık ve Çevre Tasarımı;İktisat;İlahiyat;İlköğretim Matematik Öğretmenliği;İletişim;İletişim Tasarımı;İngiliz Dili ve Edebiyatı;İngilizce Öğretmenliği;İnşaat Mühendisliği;İslami İlimler;İstatistik;İş Sağlığı ve Güvenliği;İşletme;İşletme Mühendisliği;Jeofizik Mühendisliği;Jeoloji Mühendisliği;Kamu Yönetimi;Kamu Yönetimi (Açıköğretim);Kimya;Kimya Mühendisliği;Kimya Öğretmenliği;Kontrol ve Otomasyon Mühendisliği;Kurgu, Ses ve Görüntü Yönetimi;Lojistik Yönetimi;Maden Mühendisliği;Makine Mühendisliği;Maliye;Malzeme Bilimi ve Mühendisliği;Matematik;Matematik Mühendisliği;Matematik Öğretmenliği;Matematik ve Bilgisayar Bilimleri;Mekatronik Mühendisliği;Metalurji ve Malzeme Mühendisliği;Meteoroloji Mühendisliği;Mimarlık;Moleküler Biyoloji ve Genetik;Muhasebe ve Finans Yönetimi;Okul Öncesi Öğretmenliği;Orman Endüstrisi Mühendisliği;Orman Mühendisliği;Otomotiv Mühendisliği;Özel Eğitim Öğretmenliği;Peyzaj Mimarlığı;Petrol ve Doğalgaz Mühendisliği;Polis Meslek Eğitimi;Psikolojik Danışmanlık ve Rehberlik;Psikoloji;Radyo, Televizyon ve Sinema;Rehberlik ve Psikolojik Danışmanlık;Rekreasyon;Sağlık Yönetimi;Sanat Tarihi;Sermaye Piyasası;Sınıf Öğretmenliği;Siyaset Bilimi ve Kamu Yönetimi;Siyaset Bilimi ve Uluslararası İlişkiler;Sosyal Bilgiler Öğretmenliği;Sosyal Hizmet;Sosyoloji;Spor Yöneticiliği;Su Ürünleri Mühendisliği;Şehir ve Bölge Planlama;Tarih;Tarih Öğretmenliği;Tarım Ekonomisi;Tarım Makineleri ve Teknolojileri Mühendisliği;Tarımsal Biyoteknoloji;Tekstil Mühendisliği;Turizm İşletmeciliği;Turizm Rehberliği;Türk Dili ve Edebiyatı;Türk Dili ve Edebiyatı Öğretmenliği;Türkçe Öğretmenliği;Tıp;Uçak Mühendisliği;Uluslararası Finans;Uluslararası İlişkiler;Uluslararası Ticaret;Uluslararası Ticaret ve Finansman;Uluslararası Ticaret ve Lojistik;Uluslararası Ticaret ve İşletmecilik;Yazılım Mühendisliği;Yönetim Bilişim Sistemleri;Ziraat Mühendisliği;Bahçe Bitkileri;Bitki Koruma;Tarla Bitkileri;Toprak Bilimi ve Bitki Besleme;Zootekni;Veteriner;Görsel İletişim Tasarımı;Yeni Medya;Gazetecilik ve Halkla İlişkiler;Medya ve İletişim;Ses ve Görüntü Teknolojileri;Tapu Kadastro;Gayrimenkul ve Varlık Değerleme;Muhasebe;Finans ve Bankacılık;Emlak ve Emlak Yönetimi;Yerel Yönetimler;Sosyal Hizmetler;Odyoloji;Ortez ve Protez;Perfüzyon;Sağlık Kurumları Yöneticiliği;Acil Yardım ve Afet Yönetimi;Beden Eğitimi;Arkeoloji ve Sanat Tarihi;Antropoloji;Mütercim ve Tercümanlık (İngilizce);Mütercim ve Tercümanlık (Arapça);Mütercim ve Tercümanlık (Rusça);Rus Dili ve Edebiyatı;Çağdaş Türk Lehçeleri ve Edebiyatları;Eski Çağ Dilleri ve Kültürleri;Tarih (Açıköğretim);İşletme (Açıköğretim);İktisat (Açıköğretim);Maliye (Açıköğretim);Sosyoloji (Açıköğretim);Uluslararası İlişkiler (Açıköğretim);Çalışma Ekonomisi ve Endüstri İlişkileri (Açıköğretim);Felsefe (Açıköğretim);Türk Dili ve Edebiyatı (Açıköğretim);Konaklama İşletmeciliği;Seyahat İşletmeciliği;Denizcilik İşletmeleri Yönetimi;Deniz Ulaştırma İşletme Mühendisliği;Gemi Makineleri İşletme Mühendisliği;Pilotaj;Hava Trafik Kontrol;Havacılık Yönetimi;Raylı Sistemler Mühendisliği;Elektronik Mühendisliği;Haberleşme Mühendisliği;Fotonik;Nükleer Enerji Mühendisliği;Biyosistem Mühendisliği;Tarımsal Yapılar ve Sulama;Gıda Teknolojisi;Moda Tasarımı;Tekstil ve Moda Tasarımı;Resim;Heykel;Müzik;Müzik Öğretmenliği;Resim-İş Öğretmenliği;Bilgisayar ve Bilişim Mühendisliği;Endüstriyel Tasarım Mühendisliği;Adli Bilimler;Kriminoloji;Askeri Bilimler`;
  const O = `Adalet;Acil Durum ve Afet Yönetimi;Ağız ve Diş Sağlığı;Alternatif Enerji Kaynakları Teknolojisi;Ameliyathane Hizmetleri;Anestezi;Arıcılık;Aşçılık;Bahçe Tarımı;Bankacılık ve Sigortacılık;Basım ve Yayın Teknolojileri;Bilgi Güvenliği Teknolojisi;Bilgi Yönetimi;Bilgisayar Destekli Tasarım ve Animasyon;Bilgisayar Programcılığı;Bilgisayar Teknolojisi;Biyomedikal Cihaz Teknolojisi;Büro Yönetimi ve Yönetici Asistanlığı;Büro Yönetimi ve Sekreterlik;Coğrafi Bilgi Sistemleri;Çağrı Merkezi Hizmetleri;Çevre Koruma ve Kontrol;Çocuk Gelişimi;Çocuk Koruma ve Bakım Hizmetleri;Dış Ticaret;Diyaliz;Doğalgaz ve Tesisatı Teknolojisi;Elektrik;Elektrik Enerjisi Üretim, İletim ve Dağıtımı;Elektronik Teknolojisi;Elektronörofizyoloji;Endüstriyel Elektronik;Engelli Bakımı ve Rehabilitasyon;Eczane Hizmetleri;Evde Hasta Bakımı;Fizyoterapi;Gıda Kalite Kontrolü ve Analizi;Gıda Teknolojisi;Grafik Tasarımı;Halkla İlişkiler ve Tanıtım;Harita ve Kadastro;Hava Lojistiği;Hukuk Büro Yönetimi ve Sekreterliği;İklimlendirme ve Soğutma Teknolojisi;İlk ve Acil Yardım;İnsan Kaynakları Yönetimi;İnşaat Teknolojisi;İş Sağlığı ve Güvenliği;İş ve Uğraşı Terapisi;İşletme Yönetimi;İnternet ve Ağ Teknolojileri;Kimya Teknolojisi;Laborant ve Veteriner Sağlık;Lojistik;Makine;Makine Resim ve Konstrüksiyonu;Maliye;Mekatronik;Mimari Dekoratif Sanatlar;Mimari Restorasyon;Moda Tasarımı;Muhasebe ve Vergi Uygulamaları;Ormancılık ve Orman Ürünleri;Otomotiv Teknolojisi;Optisyenlik;Ortopedik Protez ve Ortez;Özel Güvenlik ve Koruma;Patoloji Laboratuvar Teknikleri;Pazarlama;Peyzaj ve Süs Bitkileri Yetiştiriciliği;Radyo ve Televizyon Programcılığı;Radyoterapi;Raylı Sistemler Makinistliği;Sağlık Kurumları İşletmeciliği;Sivil Havacılık Kabin Hizmetleri;Sivil Savunma ve İtfaiyecilik;Sosyal Güvenlik;Sosyal Hizmetler;Spor Yönetimi;Su Altı Teknolojisi;Tapu ve Kadastro;Tarım Makineleri;Tıbbi Dokümantasyon ve Sekreterlik;Tıbbi Görüntüleme Teknikleri;Tıbbi Laboratuvar Teknikleri;Tıbbi Tanıtım ve Pazarlama;Turizm ve Otel İşletmeciliği;Turizm ve Seyahat Hizmetleri;Turist Rehberliği;Yaşlı Bakımı;Yerel Yönetimler;Yapı Denetimi;Yapı Ressamlığı;Yapı Yalıtım Teknolojisi;Web Tasarımı ve Kodlama;Veterinerlik;Zabıta;Ceza İnfaz ve Güvenlik Hizmetleri;Kültürel Miras ve Turizm;Kütüphanecilik;Arşivcilik;Medya ve İletişim;Görsel İşitsel Teknikler ve Medya Yapımcılığı;Fotoğrafçılık ve Kameramanlık;Grafik Tasarımı (Açıköğretim);Büro Yönetimi ve Yönetici Asistanlığı (Açıköğretim);Adalet (Açıköğretim);İşletme Yönetimi (Açıköğretim);Muhasebe ve Vergi Uygulamaları (Açıköğretim);Sosyal Hizmetler (Açıköğretim);Çocuk Gelişimi (Açıköğretim);Bilgisayar Programcılığı (Açıköğretim);Lojistik (Açıköğretim);Yerel Yönetimler (Açıköğretim);Halkla İlişkiler ve Tanıtım (Açıköğretim);İnsan Kaynakları Yönetimi (Açıköğretim);Sağlık Kurumları İşletmeciliği (Açıköğretim);Tıbbi Dokümantasyon ve Sekreterlik (Açıköğretim);Elektrik Enerjisi Üretim, İletim ve Dağıtımı (Açıköğretim);Su ve Atık Su Teknolojisi;Kaynak Teknolojisi;Metalurji;Mobilya ve Dekorasyon;Kontrol ve Otomasyon Teknolojisi;Elektromekanik Taşıyıcılar;Uçak Teknolojisi;Hava Aracı Bakım;Deniz ve Liman İşletmeciliği;Gemi İnşaatı;Seracılık;Tarla Bitkileri;Tohumculuk Teknolojisi;Su Ürünleri İşleme Teknolojisi;Organik Tarım;Mantarcılık;Süt ve Besi Hayvancılığı;Laboratuvar Teknolojisi;Kozmetik Teknolojisi;Saç Bakımı ve Güzellik Hizmetleri;Odyometri;Ağız ve Diş Sağlığı Teknikerliği;Acil Yardım Teknikerliği;Anestezi Teknikerliği;Ameliyathane Teknikerliği`;
  const tekil = s => [...new Set(s.split(';').map(x => x.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  const api = { 4: tekil(L), 5: tekil(L), 6: tekil(L), 3: tekil(O) };
  if (typeof module !== 'undefined') module.exports = api; else kok.BOLUMLER = api;
})(this);


/* ozet.js */
/* Şartım Tamam - ilan özeti: türü, "bu ilan ne", başvuru yeri/bağlantısı, nasıl başvurulur, "bu iş ne yapar".
   İlan metninden kendiliğinden çıkarılır; emin olunmayan yerde boş bırakılır. */
(function (kok) {
  'use strict';
  const kucuk = s => String(s || '').normalize('NFC').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();

  const TURLER = {
    memur: { ad: 'Memur', cumle: 'Devlet memuru (kadrolu) alımı.' },
    sozlesmeli: { ad: 'Sözleşmeli', cumle: 'Sözleşmeli personel alımı; memur kadrosu değildir ama kamu personelidir.' },
    isci: { ad: 'İşçi / İş Kanunu', cumle: 'İş Kanunu\'na tabi personel alımı; devlet memurluğu değildir.' },
    kariyer: { ad: 'Uzman / Müfettiş yrd.', cumle: 'Kariyer meslek giriş sınavı: önce yardımcı olarak başlanır, birkaç yıl sonra yeterlik sınavıyla uzman, müfettiş ya da denetçi olunur.' },
    askeri: { ad: 'Askerî', cumle: 'Askerî personel temini; sağlık, fiziki yeterlilik ve güvenlik soruşturması aşamaları vardır.' }
  };

  function tur(ad, metin) {
    // Önce ilanın kendi başlığı: "AÇIKTAN DEVLET MEMURU ALIM İLANI" metinde astsubay geçse de memurdur.
    const b = kucuk(ad);
    if (/devlet memuru|memur alım|zabıta memuru|itfaiye eri/.test(b) && !/sözleşmeli|işçi/.test(b)) return 'memur';
    const k = kucuk(ad + ' ' + String(metin).slice(0, 2500));
    if (/uzman erbaş|astsubay|(^|[^a-zçğıöşü])subay|sözleşmeli er(^|[^a-zçğıöşü])/.test(k)) return 'askeri';
    if (/(uzman|müfettiş|denetçi|denetmen|kontrolör|aktüer|kaymakam) (yardımcı|aday)|stajyer .{0,25}(kontrolör|müfettiş)|yardımcılığı giriş sınavı/.test(k)) return 'kariyer';
    if (/sürekli işçi|işçi (alım|temin)|kalkınma ajans|4857 sayılı|iş kanunu/.test(k)) return 'isci';
    if (/sözleşmeli|4\/b|proje bazlı/.test(k)) return 'sozlesmeli';
    return 'memur';
  }

  // Başvuru bağlantısı: Kariyer Kapısı > e-Devlet > başvuru/personel sayfası > kurum sitesi
  function baglanti(metin) {
    const L = [];
    // Satır sonunda bölünen adres birleştirilir: "turkiye.gov.tr/sahil-\nguvenlik"
    metin = String(metin).replace(/(\.(?:gov|edu|bel)\.tr\/\S*[-/])\s*\n\s*(?=[a-z0-9])/gi, '$1');
    for (const m of String(metin).matchAll(/(?<![@\w.-])(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9.-]*\.(?:gov|edu|bel|k12|org|com|av)\.tr(?:\/[^\s)"'”’,;<>]*)?/gi)) {
      let u = m[0].replace(/[.:]+$/, '');
      if (!/^https?:/i.test(u)) u = 'https://' + u;
      const k = u.toLowerCase();
      const puan = /kariyerkapisi/.test(k) ? 5 : /turkiye\.gov\.tr/.test(k) ? 4 : /basvuru|kariyer|personel|temin|sinav|ilan|insan/.test(k) ? 3 : /resmigazete|kamuilan|ilan\.gov/.test(k) ? -1 : 1;
      if (puan >= 0) L.push({ u, puan });
    }
    L.sort((a, b) => b.puan - a.puan);
    return L.length ? L[0].u : null;
  }

  function yer(metin) {
    const k = kucuk(metin);
    if (/kariyer ?kapısı|kariyerkapisi/.test(k)) return 'e-Devlet şifrenle Kariyer Kapısı üzerinden';
    if (/e-?devlet|turkiye\.gov\.tr/.test(k)) return 'e-Devlet üzerinden';
    if (/elektronik ortamda|internet (adresi|sitesi|adresinde|sitesinde) üzerinden|online|çevrim ?içi/.test(k)) return 'kurumun internet sitesinden';
    if (/posta (yoluyla|ile)|iadeli taahhütlü|kargo/.test(k) && /şahsen|elden/.test(k)) return 'şahsen ya da posta ile';
    if (/şahsen|elden teslim|bizzat/.test(k)) return 'şahsen (elden)';
    if (/posta (yoluyla|ile)|iadeli taahhütlü/.test(k)) return 'posta ile';
    return '';
  }

  function etiketler(metin) {
    const k = kucuk(metin), E = [];
    if (/sözlü sınav|mülakat/.test(k)) E.push('Sözlü sınav');
    if (/yazılı sınav/.test(k)) E.push('Yazılı sınav');
    if (/uygulamalı sınav|uygulama sınavı/.test(k)) E.push('Uygulama sınavı');
    if (/kura (ile|çekimi|yoluyla)|noter huzurunda kura/.test(k)) E.push('Kura');
    if (!E.length && /kpss.{0,60}(puan üstünlüğü|sıralama|en yüksek puan)/.test(k)) E.push('KPSS sıralaması');
    return E;
  }

  // "Bu iş ne yapar?" — kadro adına göre kısa açıklama (bilinmiyorsa boş)
  const ISLER = [
    [/zabıta/, 'Belediyenin düzen, esnaf denetimi, kaçak yapı ve gürültü gibi konularda saha denetimini yapar.'],
    [/itfaiye/, 'Yangın, kurtarma ve afet olaylarına müdahale eder; vardiyalı çalışır.'],
    [/şoför|sürücü/, 'Kurum araçlarını kullanır, personel ve malzeme taşır.'],
    [/koruma ve güvenlik|güvenlik görevlisi/, 'Kurum binalarının ve personelin güvenliğini sağlar; vardiyalı çalışır.'],
    [/büro|sekreter|veri hazırlama|memur(?! yardımcı)|vhki|idari personel/, 'Yazışma, evrak, arşiv ve veri girişi gibi büro işlerini yürütür.'],
    [/destek personeli.*(temizlik)|temizlik/, 'Kurum binalarının temizlik ve düzen işlerini yapar.'],
    [/destek personeli/, 'Kurumun büro, arşiv ve günlük destek işlerini yürütür.'],
    [/avukat|hukuk müşavir/, 'Kurumun davalarını takip eder, hukuki görüş ve sözleşme işlerini yürütür.'],
    [/mimar/, 'Kurumun yapı projelerini hazırlar, inceler ve ruhsat/denetim işlerinde çalışır.'],
    [/şehir plancı/, 'İmar planlarını hazırlar ve plan değişikliklerini inceler.'],
    [/inşaat mühendis/, 'Yapım işlerinin proje, keşif, ihale ve kontrollük işlerini yürütür.'],
    [/makine mühendis/, 'Mekanik tesisat, iş makineleri ve bakım işlerini yönetir.'],
    [/elektri.{0,12}mühendis/, 'Elektrik tesisatı, enerji ve aydınlatma işlerini proje ve denetim olarak yürütür.'],
    [/harita mühendis|harita teknik/, 'Ölçüm, aplikasyon ve kadastro/imar harita işlerini yapar.'],
    [/çevre mühendis/, 'Atık, su ve hava kirliliği konularında denetim ve proje işlerini yürütür.'],
    [/maden mühendis/, 'Maden ruhsat, sahası ve üretim işlerinde teknik çalışma yapar.'],
    [/bilgisayar mühendis|yazılım|programcı|çözümleyici|bilişim/, 'Kurumun yazılım, sistem, ağ ve veri işlerinde çalışır.'],
    [/tekniker|teknisyen/, 'Alanındaki teknik bakım, onarım, ölçüm ve kontrol işlerini yapar.'],
    [/psikolog/, 'Bireysel görüşme, değerlendirme ve psikolojik destek çalışmaları yürütür.'],
    [/sosyal çalışmacı/, 'Sosyal hizmet gerektiren kişi ve ailelerle görüşür, destek süreçlerini yürütür.'],
    [/diyetisyen/, 'Beslenme planları hazırlar, yemek hizmetlerini denetler.'],
    [/hemşire|ebe|sağlık memuru|sağlık personeli|acil tıp/, 'Hasta bakımı, tedavi ve sağlık hizmetlerinde çalışır.'],
    [/kütüphaneci|arşiv/, 'Kütüphane veya arşiv belgelerinin düzenlenmesi ve hizmete sunulmasından sorumludur.'],
    [/müfettiş yardımcı/, 'Kurumda teftiş, inceleme ve soruşturma işlerini öğrenerek yürütür; sonra müfettiş olur.'],
    [/denetçi yardımcı|denetmen yardımcı|kontrolör/, 'Mevzuata uygunluk denetimi ve incelemeleri yapar; sonra denetçi/kontrolör olur.'],
    [/uzman yardımcı/, 'Kurumun alanındaki araştırma, rapor ve mevzuat işlerinde çalışır; tezle uzman olur.'],
    [/kaymakam/, 'Kaymakam adayı olarak eğitim alır; sonra ilçenin en üst mülki amiri olarak görev yapar.'],
    [/uzman erbaş/, 'Jandarma/askerî birliklerde sözleşmeli olarak sahada görev yapar.'],
    [/aşçı/, 'Kurumun mutfağında yemek hazırlar.'],
    [/bekçi/, 'Gece devriyesiyle mahalle güvenliğine katkı verir.'],
    [/uzman$|uzman personel|uzman \(/, 'Kurumun alanındaki proje, analiz ve raporlama işlerinde uzman olarak çalışır.']
  ];
  function isNe(kadroAd) {
    const k = kucuk(kadroAd);
    const x = ISLER.find(([d]) => d.test(k));
    return x ? x[1] : '';
  }

  // Aynı PDF'te akademik ilan da olabiliyor; akademik kadrolar sayılmaz ve listelenmez.
  const akademik = ad => /profesör|doçent|öğretim (üyesi|görevlisi)|araştırma görevlisi/.test(kucuk(ad));
  function kisi(ilan) {
    if (ilan.B && ilan.B.beklenen) return +ilan.B.beklenen;   // ilanın kendi yazdığı toplam
    if (ilan.B && ilan.B.kadrolar && ilan.B.kadrolar.length) {
      const n = ilan.B.kadrolar.filter(k => !akademik(k.ad)).reduce((t, k) => t + (+k.adet || 0), 0);
      if (n) return n;
    }
    const m = kucuk(String(ilan.metin).slice(0, 1500)).match(/(?:toplam |olmak üzere |^|[^\d.])(\d{1,3}(?:\.\d{3})?|\d+) ?(?:\([a-zçğıöşü ]+\) ?)?(?:adet |kişi|kadro|pozisyon|personel|sözleşmeli|zabıta|itfaiye|memur|uzman|müfettiş|denetçi|kaymakam)/);
    return m ? +m[1].replace('.', '') : null;
  }

  function ozetle(ilan) {
    const t = tur(ilan.ad, ilan.metin), n = kisi(ilan), y = yer(ilan.metin);
    const kurum = String(ilan.ad).split(':')[0].trim();
    const ilanNe = `${kurum}${n ? `, ${n.toLocaleString('tr-TR')} kişi` : ''} alıyor. ${TURLER[t].cumle}`;
    const adimlar = [];
    if (y) adimlar.push(`Başvuru ${y} yapılır.`);
    const k = kucuk(ilan.metin);
    if (/belge.{0,60}(teslim|ulaştır)|şahsen teslim/.test(k) && !/şahsen/.test(y)) adimlar.push('İstenen belgeler ilanda yazan yere ve tarihe kadar teslim edilir.');
    const E = etiketler(ilan.metin);
    if (E.includes('Yazılı sınav')) adimlar.push('Yazılı sınav yapılır.');
    if (E.includes('Sözlü sınav')) adimlar.push('Uygun adaylar sözlü sınava (mülakata) çağrılır.');
    if (E.includes('Uygulama sınavı')) adimlar.push('Uygulamalı sınav yapılır.');
    if (E.includes('Kura')) adimlar.push('Yerleştirme kurayla yapılır.');
    if (E.includes('KPSS sıralaması')) adimlar.push('Adaylar KPSS puanına göre sıralanır.');
    if (/sonuç.{0,60}(internet|web) (sitesi|adres)/.test(k)) adimlar.push('Sonuçlar kurumun internet sitesinde ilan edilir.');
    return { tur: t, turAd: TURLER[t].ad, kisi: n, ilanNe, yer: y, link: baglanti(ilan.metin), adimlar, etiketler: E, ilkDefa: /ilk defa atan/.test(k) };
  }

  // Başvuru hazırlık listesi: ilanın "istenen belgeler" bölümünden bilinen belgeler. Bölüm bulunmazsa boş döner.
  const BELGELER = [
    ['basvuru', 'Başvuru formu / dilekçe', /başvuru formu|başvuru dilekçe|iş talep formu|dilekçe/],
    ['kimlik', 'Kimlik kartı fotokopisi', /nüfus cüzdan|(?<!görevlisi )kimlik kart|t\.? ?c\.? kimlik (numaralı|no)?.{0,20}(fotokopi|sureti|örneği)/],
    ['diploma', 'Diploma / mezuniyet belgesi', /diploma|mezuniyet belgesi/],
    ['kpss', 'KPSS sonuç belgesi', /kpss.{0,40}(sonuç|puan) belgesi|sınav sonuç belgesi|sonuç belgesinin/],
    ['foto', 'Vesikalık fotoğraf', /fotoğraf/],
    ['adli', 'Adli sicil kaydı (e-Devlet)', /adli sicil/],
    ['asker', 'Askerlik durum belgesi (erkekler)', /askerlik durum|terhis belgesi|askerlik (ile ilgili )?(belge|bilgi)|askerlik görevini/],
    ['ehliyet', 'Sürücü belgesi fotokopisi', /sürücü belgesi/],
    ['ozgecmis', 'Özgeçmiş', /özgeçmiş|\bcv\b/],
    ['dil', 'Yabancı dil belgesi (YDS/YÖKDİL)', /\byds\b|yökdil|yabancı dil (belgesi|sınav sonuç|puan)/],
    ['hizmet', 'Deneyim belgesi / SGK hizmet dökümü', /hizmet döküm|sgk.{0,30}(döküm|belge)|hizmet belgesi|deneyim belgesi|tecrübe belgesi|iş deneyim/],
    ['sertifika', 'İstenen sertifika(lar)', /sertifika/],
    ['saglik', 'Sağlık raporu', /sağlık (kurulu )?raporu/],
    ['ikamet', 'Yerleşim yeri belgesi', /ikametgah|yerleşim yeri belgesi/],
    ['transkript', 'Not dökümü (transkript)', /transkript|not döküm/],
    ['mal', 'Mal bildirimi', /mal bildirim/]
  ];
  const BELGE_BOLUM = /(istenen|istenilen|istenecek|gerekli|teslim edilecek|sunulacak|yüklenecek|ibraz edilecek) (belgeler|evraklar|evrak)|başvuru belgeleri|evrak kontrol listesi/g;
  function belgeler(metin) {
    const k = kucuk(metin).replace(/[âà]/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');   // "adlî" = "adli"
    let en = [];
    for (const m of k.matchAll(BELGE_BOLUM)) {
      let parca = k.slice(m.index, m.index + 2500);
      // Bölüm, sonraki başlıkta (başvuru yeri, sınav tarihi…) biter
      const son = parca.slice(150).search(/(^|\s)\d{1,2} ?[-.)] ?(başvuru (yeri|tarihi|şekli|süresi)|(sözlü |yazılı |uygulamalı )?sınav|değerlendirme|sonuç)/);
      if (son >= 0) parca = parca.slice(0, 150 + son);
      const L = BELGELER.filter(([, , d]) => d.test(parca)).map(([id, ad]) => ({ id, ad }));
      if (L.length > en.length) en = L;
    }
    return en.length >= 2 ? en : [];   // tek tük eşleşme güvenilmez
  }

  const api = { ozetle, isNe, tur, TURLER, baglanti, yer, akademik, belgeler };
  if (typeof module !== 'undefined') module.exports = api; else kok.Ozet = api;
})(this);


/* cekirdek/cekirdek.js */
/* Memur Ol çekirdeği — yerel (Kotlin) uygulamalar için tek giriş noktası.
   Motor dosyaları (motor, il, sure, taban, taban_veri, bolucu, bolumler, ozet) bundan ÖNCE aynı genel alanda çalıştırılır.
   Hesap mantığı uygulama.html'deki pozisyonlar()/eksikler()/engeller()/hedefPuan() ile birebir aynıdır;
   orada bir kural değişirse burada da değiştir (kontrol: node cekirdek\dene.js).
   Giriş/çıkış JSON metnidir: Android JavaScriptSandbox ve iOS JavaScriptCore yalnız metin taşır.
   Uzaktan güncelleme: node cekirdek\paketle.js --yayinla → docs/cekirdek (imzalı); uygulamalar güncelleme beklemeden alır. */
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

  kok.MemurOlCekirdek = { hesapla, ayrinti, sabitler, say,
    surum: typeof CEKIRDEK_SURUM !== 'undefined' ? CEKIRDEK_SURUM : 0, api: typeof CEKIRDEK_API !== 'undefined' ? CEKIRDEK_API : 1 };
})(this);

