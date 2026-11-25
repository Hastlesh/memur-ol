package com.celikgames.memurol

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.UIKitView
import kotlinx.cinterop.ExperimentalForeignApi
import platform.UIKit.UIView

/** iOS: Google Mobile Ads şerit görünümü Swift'ten gelir (IosKopru.seritGorunum). */
@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun ReklamSeridi() {
    val k = IosAyar.kopru ?: return
    UIKitView(factory = { k.seritGorunum() }, modifier = Modifier.fillMaxWidth().height(50.dp))
}

actual object GecisReklami { actual fun goster(): Boolean = IosAyar.kopru?.gecisGoster() ?: false }
