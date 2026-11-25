import SwiftUI
import BackgroundTasks
import AppTrackingTransparency
import FirebaseCore
import GoogleMobileAds
import ComposeApp

let ARKA_GOREV = "com.celikgames.memurol.denetim"

/// Açılış: Firebase (ayar dosyası varsa), arka plan görevi kaydı. Reklamlar, Apple'ın takip izni sorulduktan SONRA başlar.
final class UygulamaTemsilcisi: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil { FirebaseApp.configure() }
        BGTaskScheduler.shared.register(forTaskWithIdentifier: ARKA_GOREV, using: nil) { gorev in
            Kopru.paylasilan.arkaDenetimPlanla()   // bir sonrakini şimdiden planla
            IosKopruKt.arkaDenetimYap { tamam in gorev.setTaskCompleted(success: tamam.boolValue) }
            gorev.expirationHandler = { gorev.setTaskCompleted(success: false) }
        }
        return true
    }
}

@main
struct MemurOlApp: App {
    @UIApplicationDelegateAdaptor(UygulamaTemsilcisi.self) var temsilci
    @Environment(\.scenePhase) private var evre

    var body: some Scene {
        WindowGroup {
            KotlinEkran().ignoresSafeArea()
                .onChange(of: evre) { yeni in if yeni == .active { Kopru.paylasilan.reklamlariBaslat() } }
        }
    }
}

/// Kotlin (Compose Multiplatform) arayüzünü SwiftUI içine yerleştirir
struct KotlinEkran: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController { MainViewControllerKt.MainViewController(kopru: Kopru.paylasilan) }
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
