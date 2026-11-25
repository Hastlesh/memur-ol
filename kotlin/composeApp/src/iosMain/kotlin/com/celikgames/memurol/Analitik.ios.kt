package com.celikgames.memurol

/** iOS: Firebase Analytics Swift tarafında (IosKopru). Toplama varsayılan kapalı (Info.plist), izin verilince açılır. */
actual object Analitik {
    actual fun etkin(acik: Boolean) { IosAyar.kopru?.analitikEtkin(acik) }
    actual fun olay(ad: String, prm: Map<String, String>) { IosAyar.kopru?.analitikOlay(ad.take(40), prm) }
    actual fun ozellik(ad: String, deger: String?) { IosAyar.kopru?.analitikOzellik(ad.take(24), deger?.take(36)) }
}
