import UIKit
import BackgroundTasks
import AppTrackingTransparency
import WidgetKit
import FirebaseCore
import FirebaseAnalytics
import GoogleMobileAds
import ComposeApp

/// Kotlin'in IosKopru arayüzünün iPhone karşılığı: Firebase Analytics, Google Mobile Ads, WidgetKit, BGTaskScheduler.
final class Kopru: NSObject, IosKopru {
    static let paylasilan = Kopru()
    static let GRUP = "group.com.celikgames.memurol"

    // Reklam birimleri (AdMob "Memur Ol iOS" ~6833662656). Deneme (Debug) derlemesinde Google'ın test birimleri.
    #if DEBUG
    private let seritBirimi = "ca-app-pub-3940256099942544/2435281174"
    private let gecisBirimi = "ca-app-pub-3940256099942544/4411468910"
    #else
    private let seritBirimi = "ca-app-pub-6396011409934303/8398152070"
    private let gecisBirimi = "ca-app-pub-6396011409934303/1928499531"
    #endif
    private var gecis: GADInterstitialAd?
    private var reklamBasladi = false

    // ---------- İstatistik (yalnız kullanıcı izin verdiyse Kotlin çağırır) ----------
    func analitikEtkin(acik: Bool) {
        guard FirebaseApp.app() != nil else { return }
        Analytics.setAnalyticsCollectionEnabled(acik)
        if !acik { Analytics.resetAnalyticsData() }
    }
    func analitikOlay(ad: String, prm: [String: String]) {
        guard FirebaseApp.app() != nil else { return }
        Analytics.logEvent(ad, parameters: prm)
    }
    func analitikOzellik(ad: String, deger: String?) {
        guard FirebaseApp.app() != nil else { return }
        Analytics.setUserProperty(deger, forName: ad)
    }

    // ---------- Reklam ----------
    /// Önce Apple'ın takip izni sorulur (iOS 14.5+ zorunlu), cevap ne olursa olsun reklamlar başlar (izin yoksa kişiselleştirilmemiş).
    /// Gösterim modu (yalnız simülatör testi, CI ortam değişkeni): reklam ve takip izni penceresi yok — mağaza ekran görüntüleri için
    static let gosterim = ProcessInfo.processInfo.environment["MEMUROL_GOSTERIM"] == "1"

    func reklamlariBaslat() {
        guard !reklamBasladi, !Kopru.gosterim else { return }
        reklamBasladi = true
        ATTrackingManager.requestTrackingAuthorization { _ in
            DispatchQueue.main.async {
                GADMobileAds.sharedInstance().start { _ in self.gecisYukle() }
            }
        }
    }
    private func gecisYukle() {
        GADInterstitialAd.load(withAdUnitID: gecisBirimi, request: GADRequest()) { ad, _ in self.gecis = ad }
    }
    func seritGorunum() -> UIView {
        if Kopru.gosterim { return UIView() }
        let genislik = UIScreen.main.bounds.width
        let b = GADBannerView(adSize: GADCurrentOrientationAnchoredAdaptiveBannerAdSizeWithWidth(genislik))
        b.adUnitID = seritBirimi
        b.rootViewController = Kopru.ustDenetleyici()
        b.load(GADRequest())
        return b
    }
    func gecisGoster() -> Bool {
        guard let ad = gecis, let kok = Kopru.ustDenetleyici() else { gecisYukle(); return false }
        gecis = nil
        ad.present(fromRootViewController: kok)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { self.gecisYukle() }
        return true
    }
    static func ustDenetleyici() -> UIViewController? {
        let sahne = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        var v = sahne?.windows.first(where: { $0.isKeyWindow })?.rootViewController
        while let p = v?.presentedViewController { v = p }
        return v
    }

    // ---------- Ana ekran parçacığı ----------
    func pencereYaz(uygun: Int32, kontrol: Int32, son: String, ad: String, profilVar: Bool) {
        guard let d = UserDefaults(suiteName: Kopru.GRUP) else { return }
        d.set(["u": Int(uygun), "b": Int(kontrol), "s": son, "a": ad, "p": profilVar, "var": true] as [String: Any], forKey: "pencere")
        WidgetCenter.shared.reloadAllTimelines()
    }

    // ---------- Arka plan denetimi ----------
    func arkaDenetimKur(acik: Bool) {
        if acik { arkaDenetimPlanla() } else { BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: ARKA_GOREV) }
    }
    func arkaDenetimPlanla() {
        let istek = BGAppRefreshTaskRequest(identifier: ARKA_GOREV)
        istek.earliestBeginDate = Date(timeIntervalSinceNow: 3 * 3600)   // en erken 3 saat sonra; iOS zamanı kendisi seçer
        try? BGTaskScheduler.shared.submit(istek)
    }
}
