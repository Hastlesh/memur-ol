package com.celikgames.memurol

import kotlinx.serialization.Serializable
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

/** İmza doğrulama: ECDSA P-256 + SHA-256, imza DER. Android: SPKI anahtar · iOS: ham 65 bayt anahtar. */
expect fun imzaDogrula(veri: ByteArray, imzaDer: ByteArray): Boolean

/**
 * Motorun uzaktan güncellenmesi (uygulama güncellemesi beklemeden kural düzeltmeleri).
 * Sitedeki motor (docs/cekirdek) yalnız şu üçü tutarsa kullanılır:
 *   1) imza bu uygulamaya gömülü açık anahtarla doğrulanıyor (gizli anahtar yalnız geliştiricinin bilgisayarında),
 *   2) API sürümü uygulamanınkiyle aynı (hesap fonksiyonlarının biçimi değişmemiş),
 *   3) sürüm, uygulamanın içindeki motordan yeni.
 * Yüklenince örnek hesapla denenir; hata verirse silinir ve uygulamanın kendi motoruna dönülür.
 */
object CekirdekGuncel {
    const val API = 1
    private const val KOK = "https://hastlesh.github.io/memur-ol/cekirdek/"
    @Serializable data class Surum(val surum: Long = 0, val api: Int = 0, val boyut: Int = 0)

    /** Depodaki uzak motor geçerliyse (imza + api) kodunu döndürür; değilse null */
    @OptIn(ExperimentalEncodingApi::class)
    fun kayitli(gomuluSurum: Long): String? {
        val kod = Depo.oku("cekirdekKod") ?: return null
        val imza = Depo.oku("cekirdekImza") ?: return null
        val s = Depo.oku("cekirdekSurum")?.toLongOrNull() ?: return null
        if (s <= gomuluSurum) return null
        return if (runCatching { imzaDogrula(kod.encodeToByteArray(), Base64.decode(imza)) }.getOrDefault(false)) kod else null
    }

    fun sil() { Depo.yaz("cekirdekKod", null); Depo.yaz("cekirdekImza", null); Depo.yaz("cekirdekSurum", null) }

    /** Sitede daha yeni ve geçerli motor varsa indirip saklar. Yeni motor saklandıysa true. */
    @OptIn(ExperimentalEncodingApi::class)
    suspend fun denetle(eldekiSurum: Long): Boolean {
        val bilgi = indir(KOK + "surum.json")?.let { runCatching { JSON.decodeFromString(Surum.serializer(), it) }.getOrNull() } ?: return false
        if (bilgi.api != API || bilgi.surum <= eldekiSurum || bilgi.boyut !in 1..3_000_000) return false
        val kod = indir(KOK + "memurol-cekirdek.js") ?: return false
        val imza = indir(KOK + "memurol-cekirdek.sig")?.trim() ?: return false
        val tamam = runCatching { imzaDogrula(kod.encodeToByteArray(), Base64.decode(imza)) }.getOrDefault(false)
        if (!tamam) return false
        Depo.yaz("cekirdekKod", kod); Depo.yaz("cekirdekImza", imza); Depo.yaz("cekirdekSurum", bilgi.surum.toString())
        return true
    }
}
