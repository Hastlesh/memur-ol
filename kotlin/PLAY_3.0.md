# Memur Ol 3.0 (Kotlin) — Play Console'a gönderim listesi

Paket: com.celikgames.memurol · sürüm 3.0 (kod 21) · dosya: `kotlin\MemurOl.aab` (`powershell -File kotlin\yap.ps1`)
Release derlemesi gerçek AdMob birimlerini kullanır (REKLAM_TEST=false yalnız release'te); deneme (debug) test reklamı gösterir.
**Göndermeden önce kullanıcıya sor** (Memur Ol 2.0 kapalı test incelemesi; yeni değişiklik incelemeyi baştan başlatır).

## Uygulama içeriği beyanlarında değişecekler
- **Reklamlar:** "Evet, uygulamam reklam içeriyor"
- **Reklam kimliği:** "Evet" → amaç: Reklam veya pazarlama, Sahtekarlığı önleme/güvenlik
- **Veri güvenliği:** "Veri toplanıyor"
  - Aktarımda şifreleniyor: Evet · Silme isteği: Evet (uygulama içi "Bilgilerimi sil" + istatistik iznini kapatma) · Hesap: yok
  | Veri türü | Toplanıyor | Paylaşılıyor | İsteğe bağlı | Amaç |
  |---|---|---|---|---|
  | Uygulama etkinliği › Uygulama işlemleri (ilan açma, takip, adımlar) | Evet | Hayır | **Evet** (istatistik izni) | Analiz |
  | Kişisel bilgiler › Diğer (yaş aralığı, okul, bölüm, il, cinsiyet, puan aralığı) | Evet | Hayır | **Evet** (istatistik izni) | Analiz |
  | Cihaz veya diğer kimlikler (reklam kimliği; Firebase istatistik kimliği) | Evet | Evet (AdMob) | Hayır | Reklam/pazarlama, Sahtekarlık önleme, Analiz |
  | Konum › Yaklaşık konum (AdMob, IP'den) | Evet | Evet (AdMob) | Hayır | Reklam/pazarlama |
  | Uygulama bilgileri ve performansı › Teşhisler (AdMob/Firebase) | Evet | Hayır | Hayır | Analiz |
- **Hedef kitle:** 18+ (değişmez) · **IARC:** reklam içerdiği için anket yeniden doldurulabilir (sonuç değişmez)

## Mağaza girişi
- Tam açıklamadan "reklamsız" ve "hiçbir veri toplamaz" ifadeleri çıkar; şu satır eklenir:
  "Ücretsizdir; giderleri reklamla karşılanır. Bilgi girişinde ve ilan ayrıntısında şerit reklam yoktur. İsteğe bağlı anonim istatistik ilk açılışta sorulur."
- Yeni özellikler: bildirimler (yeni uygun ilan, son gün), ana ekran parçacığı, yaklaşan son günler şeridi, takip/başvuru, hazırlık listesi.
- Ekran görüntüleri: yeni Compose arayüzünden (eskiler web arayüzüne ait).

## Gizlilik politikası
https://hastlesh.github.io/memur-ol/gizlilik.html — 25 Kasım 2026'da istatistik (bölüm 3) ve reklam (bölüm 4) eklendi.

## AdMob
- Uygulama "Memur Ol" ca-app-pub-6396011409934303~5408066199 · şerit 2893583495 · geçiş 5871100628
- Play'de yayına girince AdMob'da uygulamayı mağaza girişine bağla (Uygulama ayarları → Uygulama mağazası ayrıntıları).
- Ödeme profili (vergi + IBAN) tamamlanmadan gerçek reklam gösterilmez — kullanıcı kararı.
- `app-ads.txt`: gerekirse https://hastlesh.github.io/memur-ol/app-ads.txt (Play'deki web sitesi adresinin kökünde olmalı; GitHub Pages proje alt yolunda AdMob doğrulayamaz → şimdilik yok).
