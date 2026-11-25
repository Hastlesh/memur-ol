package com.celikgames.memurol

import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.window.ComposeUIViewController

/** iOS uygulamasının giriş noktası (iosApp/ContentView.swift bunu çağırır). */
fun MainViewController() = ComposeUIViewController {
    val kapsam = rememberCoroutineScope()
    val durum = remember { UygulamaDurum(kapsam) }
    App(durum)
}
