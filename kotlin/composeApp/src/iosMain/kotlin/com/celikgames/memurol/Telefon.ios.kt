package com.celikgames.memurol

import platform.UIKit.UIImpactFeedbackGenerator
import platform.UIKit.UIImpactFeedbackStyle
import platform.UserNotifications.UNAuthorizationOptionAlert
import platform.UserNotifications.UNAuthorizationOptionBadge
import platform.UserNotifications.UNAuthorizationOptionSound
import platform.UserNotifications.UNAuthorizationStatusAuthorized
import platform.UserNotifications.UNMutableNotificationContent
import platform.UserNotifications.UNNotificationRequest
import platform.UserNotifications.UNUserNotificationCenter
import platform.darwin.dispatch_async
import platform.darwin.dispatch_get_main_queue

/**
 * iOS: bildirimler UNUserNotificationCenter ile. Arka plan denetimi (BGAppRefreshTask) Swift tarafında kaydedilir
 * (iosApp — sıradaki adım); şimdilik uygulama açıldığında hesaplanan sonuçlar kullanılır. Ana ekran parçacığı
 * iOS'ta WidgetKit (Swift) ister — sonra.
 */
actual object Telefon {
    private var izinli = false
    private val merkez get() = UNUserNotificationCenter.currentNotificationCenter()

    init { merkez.getNotificationSettingsWithCompletionHandler { a -> izinli = a?.authorizationStatus == UNAuthorizationStatusAuthorized } }

    actual fun bildirimIzni(): Boolean = izinli

    actual fun bildirimIzniIste(geriDon: (Boolean) -> Unit) {
        merkez.requestAuthorizationWithOptions(UNAuthorizationOptionAlert or UNAuthorizationOptionSound or UNAuthorizationOptionBadge) { izin, _ ->
            izinli = izin
            dispatch_async(dispatch_get_main_queue()) { geriDon(izin) }
        }
    }

    actual fun denetimKur(acik: Boolean) { /* BGTaskScheduler kaydı Swift tarafında (MemurOlApp.swift) yapılacak */ }

    actual fun bildir(b: Bildirim, sira: Int) {
        if (!izinli) return
        val icerik = UNMutableNotificationContent().apply { setTitle(b.baslik); setBody(b.metin) }
        merkez.addNotificationRequest(UNNotificationRequest.requestWithIdentifier("memurol-$sira", icerik, null), null)
    }

    actual fun pencereYaz(o: PencereOzet) { }

    actual fun titret() { UIImpactFeedbackGenerator(UIImpactFeedbackStyle.UIImpactFeedbackStyleLight).impactOccurred() }
}
