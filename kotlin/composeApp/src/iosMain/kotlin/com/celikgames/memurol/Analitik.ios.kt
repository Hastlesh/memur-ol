package com.celikgames.memurol

/** iOS: Firebase iOS kütüphanesi Swift tarafında eklenince bağlanacak; şimdilik hiçbir şey göndermez. */
actual object Analitik {
    actual fun etkin(acik: Boolean) {}
    actual fun olay(ad: String, prm: Map<String, String>) {}
    actual fun ozellik(ad: String, deger: String?) {}
}
