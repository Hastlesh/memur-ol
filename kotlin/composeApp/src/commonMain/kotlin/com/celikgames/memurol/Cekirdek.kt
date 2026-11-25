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
    private var motor = JsMotor()
    private val kilit = Mutex()
    private var hazir = false
    private var ilanImza = ""
    private var sonIlanMetin: String? = null
    var ilanHam: List<JsonObject> = emptyList(); private set
    /** Çalışan motorun sürümü ve nereden geldiği ("uygulama" | "site") */
    var surum: Long = 0; private set
    var kaynak: String = "uygulama"; private set

    @OptIn(ExperimentalResourceApi::class)
    private suspend fun hazirla() {
        if (hazir) return
        val gomulu = Res.readBytes("files/memurol-cekirdek.js").decodeToString()
        val gomuluSurum = Regex("CEKIRDEK_SURUM = (\\d+)").find(gomulu)?.groupValues?.get(1)?.toLongOrNull() ?: 0
        // Siteden gelmiş, imzası tutan ve daha yeni motor varsa onu dene; çalışmazsa sil ve kendi motoruna dön
        val uzak = CekirdekGuncel.kayitli(gomuluSurum)
        if (uzak != null) {
            val tamam = runCatching {
                motor.calistir(uzak + "\n'tamam'")
                check(motor.calistir("String(MemurOlCekirdek.api)") == CekirdekGuncel.API.toString())
                JSON.decodeFromString(Sabitler.serializer(), motor.calistir("MemurOlCekirdek.sabitler()"))
            }.isSuccess
            if (tamam) { hazir = true; kaynak = "site"; surum = Depo.oku("cekirdekSurum")?.toLongOrNull() ?: 0; return }
            CekirdekGuncel.sil(); motor.kapat(); motor = JsMotor()
        }
        motor.calistir(gomulu + "\n'tamam'")
        hazir = true; kaynak = "uygulama"; surum = gomuluSurum
    }

    /** Siteden yeni motor geldiyse motoru baştan kurar (ilanlar yeniden yüklenir). Deneme hesabı hata verirse kendi motoruna döner. */
    suspend fun motoruYenile(): Boolean = kilit.withLock {
        motor.kapat(); motor = JsMotor(); hazir = false; ilanImza = ""
        hazirla()
        sonIlanMetin?.let { yukleIc(it) }
        val calisiyor = runCatching { JSON.decodeFromString(Sayac.serializer(), motor.calistir("MemurOlCekirdek.say(ILANLAR, '{}', null)")) }.isSuccess
        if (!calisiyor && kaynak == "site") {
            CekirdekGuncel.sil(); motor.kapat(); motor = JsMotor(); hazir = false; ilanImza = ""
            hazirla(); sonIlanMetin?.let { yukleIc(it) }
        }
        kaynak == "site"
    }

    /** ilanlar.json metnini motora yükler. Geçersizse false. */
    suspend fun ilanlariYukle(ilanlarJson: String): Boolean = kilit.withLock {
        hazirla()
        yukleIc(ilanlarJson)
    }

    private suspend fun yukleIc(ilanlarJson: String): Boolean {
        val dizi = runCatching { Json.parseToJsonElement(ilanlarJson).jsonObject["ilanlar"]!!.jsonArray }.getOrNull() ?: return false
        if (dizi.isEmpty()) return false
        val metin = dizi.toString()
        if (metin.hashCode().toString() == ilanImza) return true
        // JSON metni JS'de doğrudan dizi değişmezi olarak geçerlidir
        motor.calistir("var ILANLAR = JSON.stringify($metin); 'tamam'")
        ilanImza = metin.hashCode().toString()
        ilanHam = dizi.map { it.jsonObject }
        sonIlanMetin = ilanlarJson
        return true
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
