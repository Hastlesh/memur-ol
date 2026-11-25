package com.celikgames.memurol

/** Ortak JS çekirdeğini çalıştıran motor. Android: JavaScriptSandbox · iOS: JavaScriptCore. */
expect class JsMotor() {
    /** Betiği çalıştırır, son ifadenin değerini metin olarak döndürür. */
    suspend fun calistir(kod: String): String
    fun kapat()
}

/** Küçük anahtar-değer deposu (yalnız bu telefonda). Android: SharedPreferences · iOS: NSUserDefaults. */
expect object Depo {
    fun oku(anahtar: String): String?
    fun yaz(anahtar: String, deger: String?)
}

/** İnternetten metin indirir (yalnız https). Hata olursa null. */
expect suspend fun indir(adres: String): String?

/**
 * Koşullu indirme: son alınan sürümün damgası (Last-Modified) verilir; dosya değişmediyse sunucu 0 bayt döner
 * (HTTP 304) → metin null, degismedi = true. 500+ kullanıcıda GitHub Pages trafiğini ~3 kat azaltır.
 */
expect suspend fun indirKosullu(adres: String, damga: String?): Indirilen?
data class Indirilen(val metin: String?, val damga: String?, val degismedi: Boolean)

/** Dış bağlantıyı tarayıcıda açar (yalnız http/https). */
expect fun disAc(adres: String)

/** Telefonun paylaş menüsü. */
expect fun paylas(metin: String)

/** Şu anki zaman, ISO 8601 (çekirdeğe "bugün" olarak verilir). */
expect fun simdiIso(): String

/** Bildirimler, arka plan denetimi ve ana ekran parçacığı (telefona özgü kısımlar). */
expect object Telefon {
    /** Bildirim izni verilmiş mi (Android 13+ / iOS sorar) */
    fun bildirimIzni(): Boolean
    /** İzin penceresini açar; sonuç gelince geriDon(izinVerildi) */
    fun bildirimIzniIste(geriDon: (Boolean) -> Unit)
    /** 3 saatte bir arka plan denetimi (internet varken). acik=false: kapatır */
    fun denetimKur(acik: Boolean)
    fun bildir(b: Bildirim, sira: Int)
    fun pencereYaz(o: PencereOzet)
    /** Kısa titreşim (konfetiyle birlikte) */
    fun titret()
}
