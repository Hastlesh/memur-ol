package com.celikgames.memurol

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// encodeDefaults = true ŞART: puan türü (P3) ve yılı varsayılan değer olsa da motora gitmeli; yoksa puan tanınmaz.
// explicitNulls = false: boş (null) alanlar hiç yazılmaz, JS tarafı "sorulmadı" diye anlar.
val JSON = Json { ignoreUnknownKeys = true; explicitNulls = false; encodeDefaults = true; coerceInputValues = true }

/** Kişinin bilgileri — alan adları JS çekirdeğinin beklediğiyle aynı (motor.js / bolucu.js). Sadece telefonda saklanır. */
@Serializable
data class Profil(
    val ad: String? = "Ben",
    val okul: Int? = null,            // 2 lise, 3 ön lisans, 4 lisans, 5 yüksek lisans
    val bolum: String? = null,
    val puanYok: Boolean? = null,
    val puanlar: List<Puan> = emptyList(),
    val dogum: String? = null,        // YYYY-AA-GG
    val cinsiyet: String? = null,     // K / E
    val asker: String? = null,        // yapti / muaf / tecilli / yapmadi
    val ikamet: String? = null,
    val ehliyet: String? = null,      // "B, C" ; null = sorulmadı, "" = yok
    val ehliyetVar: Boolean? = null,
    val belgeler: List<String>? = null,
    val belgeSoruldu: Boolean? = null,
    val boy: String? = null,
    val kilo: String? = null,
    val deneyim: String? = null,
    val ogrenci: String? = null,      // degil / orgun
    val kadrolu: String? = null,      // hayir / evet
    val sozlesmeli: String? = null,
    val fesih: String? = null,
    val emekli: String? = null,
    val iller: String? = null,
    val genel: Boolean? = true,
)

@Serializable
data class Puan(val tur: String = "P3", val puan: String = "", val yil: String = "2026")

// ---------- Çekirdeğin hesap sonucu ----------
@Serializable
data class HesapSonuc(val ilanlar: List<Ilan> = emptyList(), val profil: ProfilOzet = ProfilOzet())

@Serializable
data class Ilan(
    val id: String,
    val eklendi: Long = 0,
    val kurum: String = "",
    val kurumKisa: String = "",
    val konu: String = "",
    val konuKisa: String = "",
    val kaynak: String? = null,
    val duyuru: Boolean = false,
    val eksik: Boolean = false,
    val sure: Sure = Sure(),
    val ozet: IlanOzet = IlanOzet(),
    val pozisyonlar: List<Pozisyon> = emptyList(),
)

@Serializable
data class Sure(val kod: String = "belirsiz", val kisa: String = "", val baslik: String = "", val not: List<String> = emptyList(), val son: String? = null, val bas: String? = null)

@Serializable
data class IlanOzet(
    val tur: String? = null, val turAd: String? = null, val kisi: Int? = null, val ilanNe: String = "", val yer: String = "",
    val link: String? = null, val adimlar: List<String> = emptyList(), val etiketler: List<String> = emptyList(), val ilkDefa: Boolean = false,
)

@Serializable
data class Pozisyon(
    val anahtar: String, val i: Int = -1, val ad: String = "", val grup: String = "bak", val neden: String = "",
    val adet: Int? = null, val ildeki: Int? = null, val tablosuz: Boolean = false, val kpssPuan: Double? = null,
    val sartlar: List<Sart> = emptyList(),
)

@Serializable
data class Sart(val tur: String? = null, val sinif: String? = null, val durum: String = "bak", val not: String = "", val eksik: String? = null, val metin: String? = null)

@Serializable
data class ProfilOzet(
    val doluluk: Int = 0,
    val bos: List<EksikAlan> = emptyList(),
    val eksikler: List<EksikAlan> = emptyList(),
    val engeller: List<Engel> = emptyList(),
    val hedefPuan: List<HedefPuan> = emptyList(),
    val enYuksekPuan: Double = 0.0,
)

@Serializable data class EksikAlan(val alan: String, val ad: String, val adim: Int, val etkiledigi: Int = 0)
@Serializable data class Engel(val ad: String, val n: Int)
@Serializable data class HedefPuan(val anahtar: String, val puan: Double)
@Serializable data class Ayrinti(val belgeler: List<Belge> = emptyList(), val isNe: String? = null, val statu: String? = null, val taban: TabanKiyas? = null, val metin: String = "")
/** Geçen yılın taban puanları: il sayısı ve senin puanının yettiği il sayısı */
@Serializable data class TabanKiyas(val yil: String = "", val il: Int = 0, val yeter: Int = 0)
@Serializable data class Belge(val id: String = "", val ad: String = "")

@Serializable
data class Sabitler(
    val bolumler: Map<String, List<String>> = emptyMap(),
    val iller: List<String> = emptyList(),
    val belgeler: List<String> = emptyList(),
    val puanOkul: Map<String, String> = emptyMap(),
)

@Serializable data class Sayac(val uygun: Int = 0, val bak: Int = 0)
