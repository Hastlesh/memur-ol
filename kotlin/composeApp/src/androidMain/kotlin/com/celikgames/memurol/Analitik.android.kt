package com.celikgames.memurol

import android.os.Bundle
import com.google.firebase.analytics.FirebaseAnalytics

/**
 * Android: Firebase Analytics (proje memur-ol). Manifestte toplama varsayılan KAPALI;
 * yalnız kullanıcı "Evet" deyince açılır. Reklam kimliği hiç toplanmaz (manifest + AD_ID izni kaldırıldı).
 * Olay adları ve parametre adları Firebase kuralına uyar: harf/rakam/alt çizgi, en çok 40 karakter.
 */
actual object Analitik {
    private val fa get() = FirebaseAnalytics.getInstance(AndroidBaglam.ctx)

    actual fun etkin(acik: Boolean) {
        fa.setAnalyticsCollectionEnabled(acik)
        if (!acik) fa.resetAnalyticsData()   // izni geri çekerse telefondaki istatistik kimliği de silinir
    }

    actual fun olay(ad: String, prm: Map<String, String>) {
        val b = Bundle(); prm.forEach { (k, v) -> b.putString(k.take(40), v.take(100)) }
        fa.logEvent(ad.take(40), b)
    }

    actual fun ozellik(ad: String, deger: String?) { fa.setUserProperty(ad.take(24), deger?.take(36)) }
}
