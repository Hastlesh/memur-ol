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

  const api = { ozetle, isNe, tur, TURLER, baglanti, yer, akademik };
  if (typeof module !== 'undefined') module.exports = api; else kok.Ozet = api;
})(this);
