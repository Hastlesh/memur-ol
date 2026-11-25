package com.celikgames.memurol

import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.window.ComposeUIViewController

/** iOS uygulamasının giriş noktası (iosApp/Sources/MemurOlApp.swift). kopru: Swift'teki iPhone kütüphaneleri köprüsü. */
fun MainViewController(kopru: IosKopru?) = ComposeUIViewController {
    IosAyar.kopru = kopru
    val kapsam = rememberCoroutineScope()
    val durum = remember { UygulamaDurum(kapsam) }
    App(durum)
}
