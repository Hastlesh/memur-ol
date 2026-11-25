package com.celikgames.memurol

import androidx.compose.runtime.Composable

/** iOS: Google Mobile Ads iOS kütüphanesi Swift tarafında eklenince bağlanacak; şimdilik reklam yok. */
@Composable
actual fun ReklamSeridi() {}

actual object GecisReklami { actual fun goster(): Boolean = false }
