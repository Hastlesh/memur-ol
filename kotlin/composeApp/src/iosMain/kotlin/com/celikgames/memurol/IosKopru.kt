package com.celikgames.memurol

import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import platform.UIKit.UIView

/**
 * iPhone'a özgü kütüphaneler (Firebase, Google Mobile Ads, WidgetKit, BGTaskScheduler) Swift tarafında.
 * Swift (iosApp/Sources/Kopru.swift) bu arayüzü uygular ve açılışta IosAyar.kopru'ya verir.
 * Kopru yoksa (ör. testte) her şey sessizce atlanır.
 */
interface IosKopru {
    fun analitikEtkin(acik: Boolean)
    fun analitikOlay(ad: String, prm: Map<String, String>)
    fun analitikOzellik(ad: String, deger: String?)
    /** Alt şerit reklam görünümü (GADBannerView) */
    fun seritGorunum(): UIView
    fun gecisGoster(): Boolean
    /** Ana ekran parçacığı verisi (App Group'a yazılır, WidgetKit yenilenir) */
    fun pencereYaz(uygun: Int, kontrol: Int, son: String, ad: String, profilVar: Boolean)
    /** Arka plan denetimini (BGAppRefreshTask) planla / iptal et */
    fun arkaDenetimKur(acik: Boolean)
}

object IosAyar { var kopru: IosKopru? = null }

/**
 * Swift'in arka plan görevinden çağrılır: güncel ilanları indirir, hesaplar, bildirim ve parçacığı günceller.
 * bitti(true) = başarılı (iOS'a görev bitti denir).
 */
fun arkaDenetimYap(bitti: (Boolean) -> Unit) {
    MainScope().launch {
        val c = Cekirdek()
        val sonuc = runCatching {
            val p = Depo.oku("profil")?.let { JSON.decodeFromString(Profil.serializer(), it) } ?: return@runCatching true
            IlanKaynagi.getir()
            val liste = Depo.oku("ilanlar") ?: return@runCatching false
            if (!c.ilanlariYukle(liste)) return@runCatching false
            val s = c.hesapla(p)
            Denetim.calistir(c, p, s).forEachIndexed { i, b -> Telefon.bildir(b, i) }
            Telefon.pencereYaz(Denetim.pencereOzeti(s, true))
            true
        }.getOrDefault(false)
        c.kapat()
        bitti(sonuc)
    }
}
