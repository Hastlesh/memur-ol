import WidgetKit
import SwiftUI

/// Ana ekran parçacığı: sana uygun ilan sayısı + en yakın son gün. Veriyi uygulama App Group'a yazar (Kopru.pencereYaz).
struct Kayit: TimelineEntry {
    let date: Date
    let uygun: Int, kontrol: Int, son: String, ad: String, profilVar: Bool, veriVar: Bool
}

struct Saglayici: TimelineProvider {
    func oku() -> Kayit {
        let d = UserDefaults(suiteName: "group.com.celikgames.memurol")?.dictionary(forKey: "pencere") ?? [:]
        return Kayit(date: Date(), uygun: d["u"] as? Int ?? 0, kontrol: d["b"] as? Int ?? 0, son: d["s"] as? String ?? "",
                     ad: d["a"] as? String ?? "", profilVar: d["p"] as? Bool ?? true, veriVar: d["var"] as? Bool ?? false)
    }
    func placeholder(in context: Context) -> Kayit { Kayit(date: Date(), uygun: 3, kontrol: 5, son: "10 Ara · 4 gün kaldı", ad: "Zabıta Memuru", profilVar: true, veriVar: true) }
    func getSnapshot(in context: Context, completion: @escaping (Kayit) -> Void) { completion(context.isPreview ? placeholder(in: context) : oku()) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Kayit>) -> Void) {
        completion(Timeline(entries: [oku()], policy: .after(Date(timeIntervalSinceNow: 3 * 3600))))
    }
}

struct PencereGorunumu: View {
    let k: Kayit
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Memur Ol").font(.caption.bold()).foregroundStyle(.white.opacity(0.9))
            Spacer(minLength: 0)
            if !k.veriVar || !k.profilVar {
                Text("–").font(.system(size: 38, weight: .bold)).foregroundStyle(.white)
                Text(k.veriVar ? "Bilgilerini gir" : "Uygulamayı bir kez aç").font(.caption).foregroundStyle(.white.opacity(0.9))
            } else {
                HStack(alignment: .lastTextBaseline, spacing: 8) {
                    Text("\(k.uygun)").font(.system(size: 38, weight: .bold)).foregroundStyle(.white)
                    Text(k.kontrol > 0 ? "sana uygun ilan\n\(k.kontrol) ilanda şartlara bak" : "sana uygun ilan")
                        .font(.caption).foregroundStyle(.white.opacity(0.9)).lineLimit(2)
                }
                if !k.son.isEmpty {
                    Text("Son gün \(k.son)").font(.caption2.bold()).foregroundStyle(.white).lineLimit(1)
                        .padding(.horizontal, 8).padding(.vertical, 4).background(.white.opacity(0.18), in: Capsule())
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .pencereZemin()
    }
}

private let ZEMIN = LinearGradient(colors: [Color(red: 0.44, green: 0.28, blue: 0.91), Color(red: 0.14, green: 0.07, blue: 0.39)],
                                   startPoint: .topLeading, endPoint: .bottomTrailing)

extension View {
    /// iOS 17+: parçacık zemini sistemin istediği yoldan; iOS 16: normal arka plan
    @ViewBuilder func pencereZemin() -> some View {
        if #available(iOSApplicationExtension 17.0, *) { self.containerBackground(ZEMIN, for: .widget) }
        else { self.padding().background(ZEMIN) }
    }
}

@main
struct MemurOlWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MemurOlPencere", provider: Saglayici()) { k in PencereGorunumu(k: k) }
            .configurationDisplayName("Memur Ol")
            .description("Sana uygun ilan sayısı ve en yakın son başvuru günü")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}
