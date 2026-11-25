package com.celikgames.memurol

import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.window.ComposeUIViewController
import platform.Foundation.NSProcessInfo

/** iOS uygulamasının giriş noktası (iosApp/Sources/MemurOlApp.swift). kopru: Swift'teki iPhone kütüphaneleri köprüsü. */
fun MainViewController(kopru: IosKopru?) = ComposeUIViewController {
    IosAyar.kopru = kopru
    val kapsam = rememberCoroutineScope()
    val durum = remember {
        gosterimHazirla()
        UygulamaDurum(kapsam).also { d ->
            ortam("MEMUROL_TEMA")?.let { d.temaDegis(it) }
            when (val e = ortam("MEMUROL_EKRAN")) { null -> {}; "sihirbaz" -> d.sihirbazAc(1); else -> d.hedefAc(null, null, e) }
        }
    }
    App(durum)
}

/**
 * Gösterim modu — YALNIZ simülatör testinde (CI: SIMCTL_CHILD_* ortam değişkenleri). Normal açılışta bu değişkenler yoktur.
 *  MEMUROL_ISTATISTIK_SORMA=1 → izin penceresi gösterilmez (ekran görüntüsü için)
 *  MEMUROL_ORNEK=1            → örnek profil yazılır
 *  MEMUROL_EKRAN=uygun|ilanlar|profil → o sekme açılır
 */
private fun ortam(ad: String): String? = NSProcessInfo.processInfo.environment[ad] as? String

private fun gosterimHazirla() {
    if (ortam("MEMUROL_ISTATISTIK_SORMA") == "1" || ortam("MEMUROL_ORNEK") == "1") Depo.yaz("istatistik", "hayir")
    if (ortam("MEMUROL_ORNEK") == "1") {
        Depo.yaz("bildirim", "kapali")
        Depo.yaz("profil", JSON.encodeToString(Profil.serializer(), Profil(
            okul = 4, bolum = "Kamu Yönetimi", puanYok = false, puanlar = listOf(Puan("P3", "85", "2026")),
            dogum = "1997-01-01", cinsiyet = "E", asker = "yapti", ikamet = "Ankara", ehliyet = "B", ehliyetVar = true,
            belgeler = emptyList(), belgeSoruldu = true, boy = "175", kilo = "72", ogrenci = "degil",
            kadrolu = "hayir", sozlesmeli = "hayir", fesih = "hayir", emekli = "hayir", genel = true,
        )))
    }
}
