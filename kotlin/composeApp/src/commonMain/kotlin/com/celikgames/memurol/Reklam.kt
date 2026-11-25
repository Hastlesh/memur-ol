package com.celikgames.memurol

import androidx.compose.runtime.Composable

/** Ekranın altındaki şerit reklam (yalnız liste ekranlarında çağrılır). */
@Composable
expect fun ReklamSeridi()

/** Tam ekran (geçiş) reklamı: hazırsa gösterir, gösterdiyse true. */
expect object GecisReklami {
    fun goster(): Boolean
}

/**
 * Tam ekran reklam kuralı: ilk kayıttan sonra, ilan ayrıntısından her 4 dönüşte bir, en sık 3 dakikada bir.
 * Bildirimden / kısayoldan açılan ilanda ve bilgi girişinde gösterilmez.
 */
object ReklamKurali {
    private var sayac = 0
    private var son = 0L
    private const val ARALIK_MS = 3 * 60 * 1000L

    fun ayrintidanDonuldu(simdiMs: Long, bildirimden: Boolean) {
        if (bildirimden) return
        sayac++
        if (sayac >= 4 && simdiMs - son >= ARALIK_MS && GecisReklami.goster()) { sayac = 0; son = simdiMs }
    }
}
