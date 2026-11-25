import SwiftUI
import ComposeApp

@main
struct MemurOlApp: App {
    var body: some Scene {
        WindowGroup { KotlinEkran().ignoresSafeArea() }
    }
}

/// Kotlin (Compose Multiplatform) arayüzünü SwiftUI içine yerleştirir
struct KotlinEkran: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController { MainViewControllerKt.MainViewController() }
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
