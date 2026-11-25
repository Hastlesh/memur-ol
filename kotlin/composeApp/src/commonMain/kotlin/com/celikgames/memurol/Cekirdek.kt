package com.celikgames.memurol

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import memurol.composeapp.generated.resources.Res
import org.jetbrains.compose.resources.ExperimentalResourceApi

/**
 * Ortak JS çekirdeği (SartimTamam\cekirdek\memurol-cekirdek.js — sunucudaki taramayla aynı motor).
 * İlanlar bir kez motora yüklenir; profil değişince yalnız hesap yeniden yapılır.
 */
class Cekirdek {
    private val motor = JsMotor()
    private val kilit = Mutex()
    private var hazir = false
    private var ilanImza = ""
    var ilanHam: List<JsonObject> = emptyList(); private set

    @OptIn(ExperimentalResourceApi::class)
    private suspend fun hazirla() {
        if (hazir) return
        val kod = Res.readBytes("files/memurol-cekirdek.js").decodeToString()
        motor.calistir(kod + "\n'tamam'")
        hazir = true
    }

    /** ilanlar.json metnini motora yükler. Geçersizse false. */
    suspend fun ilanlariYukle(ilanlarJson: String): Boolean = kilit.withLock {
        val dizi = runCatching { Json.parseToJsonElement(ilanlarJson).jsonObject["ilanlar"]!!.jsonArray }.getOrNull() ?: return false
        if (dizi.isEmpty()) return false
        hazirla()
        val metin = dizi.toString()
        if (metin.hashCode().toString() == ilanImza) return true
        // JSON metni JS'de doğrudan dizi değişmezi olarak geçerlidir
        motor.calistir("var ILANLAR = JSON.stringify($metin); 'tamam'")
        ilanImza = metin.hashCode().toString()
        ilanHam = dizi.map { it.jsonObject }
        true
    }

    suspend fun hesapla(p: Profil): HesapSonuc = kilit.withLock {
        hazirla()
        val sonuc = motor.calistir("MemurOlCekirdek.hesapla(ILANLAR, ${jsMetin(JSON.encodeToString(p))}, ${jsMetin(simdiIso())})")
        JSON.decodeFromString(HesapSonuc.serializer(), sonuc)
    }

    suspend fun say(p: Profil): Sayac = kilit.withLock {
        hazirla()
        JSON.decodeFromString(Sayac.serializer(), motor.calistir("MemurOlCekirdek.say(ILANLAR, ${jsMetin(JSON.encodeToString(p))}, ${jsMetin(simdiIso())})"))
    }

    suspend fun ayrinti(ilanId: String, kadroAd: String?, kadroSira: Int = -1, p: Profil? = null): Ayrinti = kilit.withLock {
        hazirla()
        val ham = ilanHam.firstOrNull { it["id"].toString().trim('"') == ilanId } ?: return Ayrinti()
        val r = motor.calistir("MemurOlCekirdek.ayrinti(${jsMetin(ham.toString())}, ${if (kadroAd == null) "null" else jsMetin(kadroAd)}, $kadroSira, ${jsMetin(JSON.encodeToString(Profil.serializer(), p ?: Profil()))})")
        runCatching { JSON.decodeFromString(Ayrinti.serializer(), r) }.getOrDefault(Ayrinti())
    }

    suspend fun sabitler(): Sabitler = kilit.withLock {
        hazirla()
        JSON.decodeFromString(Sabitler.serializer(), motor.calistir("MemurOlCekirdek.sabitler()"))
    }

    fun kapat() = motor.kapat()

    companion object {
        /** Kotlin metnini güvenli JS metin değişmezine çevirir (JSON metin kuralı JS'de de geçerli). */
        fun jsMetin(s: String): String = Json.encodeToString(s).replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    }
}
