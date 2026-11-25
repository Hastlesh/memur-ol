package com.celikgames.memurol

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import memurol.composeapp.generated.resources.Res
import org.jetbrains.compose.resources.ExperimentalResourceApi

const val ILAN_ADRESI = "https://hastlesh.github.io/memur-ol/ilanlar.json"
const val SITE = "https://hastlesh.github.io/memur-ol/"
const val RESMI_DEGIL = "Memur Ol resmî bir devlet uygulaması değildir; hiçbir kamu kurumuyla bağlantısı yoktur. İlanlar Resmî Gazete, Kariyer Kapısı ve kurumların kendi sitelerinde yayımlanan resmî metinlerden derlenir."

/** İlan listesini indirir: değişmediyse 0 bayt (koşullu istek). Yeni liste geçerliyse önbelleğe ve damgasıyla yazar. */
object IlanKaynagi {
    suspend fun getir(): Indirilen? {
        val eldeki = Depo.oku("ilanlar")
        val r = indirKosullu(ILAN_ADRESI, if (eldeki != null) Depo.oku("ilanDamga") else null) ?: return null
        if (r.degismedi) return if (eldeki != null) r else null
        val m = r.metin ?: return null
        if (!m.contains("\"ilanlar\"")) return null   // bozuk/eksik cevap önbelleğin yerine geçmez
        Depo.yaz("ilanlar", m); Depo.yaz("ilanDamga", r.damga)
        return r
    }
}

sealed interface Ekran {
    data object Karsilama : Ekran
    data class Sihirbaz(val adim: Int = 0) : Ekran
    data object Ana : Ekran
    /** disaridan: bildirim/kısayoldan açıldı (dönüşte tam ekran reklam gösterilmez) */
    data class IlanAyrinti(val ilanId: String, val pozAnahtar: String? = null, val disaridan: Boolean = false) : Ekran
}

/** Uygulamanın tüm durumu. Ekranlar yalnız bunu okur; değişiklik buradaki fonksiyonlarla yapılır. */
class UygulamaDurum(private val kapsam: CoroutineScope) {
    val cekirdek = Cekirdek()

    var tema by mutableStateOf(Depo.oku("tema") ?: "oto")
    var profil by mutableStateOf(Depo.oku("profil")?.let { runCatching { JSON.decodeFromString(Profil.serializer(), it) }.getOrNull() })
        private set
    var sonuc by mutableStateOf<HesapSonuc?>(null); private set
    var sabit by mutableStateOf(Sabitler()); private set
    var yukleniyor by mutableStateOf(true); private set
    var hata by mutableStateOf<String?>(null); private set
    /** canli | onbellek | gomulu */
    var kaynak by mutableStateOf("gomulu"); private set
    var guncel by mutableStateOf<String?>(null); private set

    val yigin = mutableStateListOf<Ekran>(if (profil == null) Ekran.Karsilama else Ekran.Ana)
    val ekran get() = yigin.last()
    var sekme by mutableStateOf(if (profil == null) 0 else 1)   // 0 İlanlar · 1 Sana uygun · 2 Profil

    // Sihirbaz taslağı + canlı sayaç
    var taslak by mutableStateOf(profil ?: Profil())
    var sayac by mutableStateOf<Sayac?>(null); private set
    private var sayacIs: Job? = null

    // Takip / başvuru ("<ilan>#<kadro>" → "takip" | "basvurdum") ve belge hazırlığı (ilan → belge id'leri)
    var takip by mutableStateOf(haritaOku("takip")); private set
    var hazirlik by mutableStateOf(Depo.oku("hazirlik")?.let { runCatching { JSON.decodeFromString(MapSerializer(String.serializer(), ListSerializer(String.serializer())), it) }.getOrNull() } ?: emptyMap()); private set

    @OptIn(ExperimentalResourceApi::class)
    private suspend fun baslat() {
        try {
            sabit = cekirdek.sabitler()
            // 1) Elde olan en yeni liste: önce önbellek, yoksa uygulamayla gelen kopya
            val onbellek = Depo.oku("ilanlar")
            if (onbellek != null && cekirdek.ilanlariYukle(onbellek)) { kaynak = "onbellek"; guncel = guncelOku(onbellek) }
            else { val g = Res.readBytes("files/ilanlar.json").decodeToString(); cekirdek.ilanlariYukle(g); kaynak = "gomulu"; guncel = guncelOku(g) }
            hesapla()
            // 2) İnternetten güncel liste
            yenile()
        } catch (e: Throwable) {
            hata = "Hesap motoru açılamadı: ${e.message?.take(160) ?: e::class.simpleName}"
        } finally { yukleniyor = false }
    }

    suspend fun yenile(): Boolean {
        // Önce motor: sitede imzalı daha yeni motor varsa al ve hemen kullan (uygulama güncellemesi gerekmez)
        runCatching { if (CekirdekGuncel.denetle(cekirdek.surum)) { cekirdek.motoruYenile(); hesapla() } }
        val r = IlanKaynagi.getir() ?: return false
        if (r.degismedi) { kaynak = "canli"; return true }   // elimizdeki liste zaten güncel: yeniden hesap gerekmez
        if (!cekirdek.ilanlariYukle(r.metin!!)) return false
        kaynak = "canli"; guncel = guncelOku(r.metin)
        hesapla(); return true
    }

    fun yenileBaslat() { kapsam.launch { yukleniyor = true; if (!yenile()) hesapla(); yukleniyor = false } }

    private fun guncelOku(m: String) = Regex("\"guncel\"\\s*:\\s*\"([^\"]+)\"").find(m)?.groupValues?.get(1)

    /** Hesap hatası uygulamayı kilitlemez: son sonuç ekranda kalır, üstte kısa uyarı çıkar. */
    suspend fun hesapla() {
        val p = profil ?: Profil()
        try {
            val s = cekirdek.hesapla(p); sonuc = s; hata = null
            // Ekranda görülenler "bildirildi" sayılır (arka denetim yalnız yenileri bildirir); parçacık güncellenir
            if (profil != null) Denetim.isaretle(s)
            runCatching { Telefon.pencereYaz(Denetim.pencereOzeti(s, profil != null)) }
        } catch (e: Throwable) { hata = "Hesaplamada sorun çıktı, son sonuçlar gösteriliyor. (${e.message?.take(120) ?: e::class.simpleName})" }
    }

    // ---------- Bildirimler ----------
    var bildirimAcik by mutableStateOf(Depo.oku("bildirim") == "acik" && Telefon.bildirimIzni()); private set
    fun bildirimDegis(ac: Boolean) {
        if (!ac) { bildirimAcik = false; Depo.yaz("bildirim", "kapali"); Telefon.denetimKur(false); Istatistik.olay("bildirim", "durum" to "kapali"); return }
        Telefon.bildirimIzniIste { izin ->
            bildirimAcik = izin; Depo.yaz("bildirim", if (izin) "acik" else "kapali"); Telefon.denetimKur(izin)
            Istatistik.olay("bildirim", "durum" to if (izin) "acik" else "izin_verilmedi")
        }
    }
    val sonDenetim get() = Depo.oku("sonDenetim")

    // Bildirim / kısayol / parçacıktan gelen hedef
    fun hedefAc(ilanId: String?, poz: String?, sekmeAdi: String?) {
        if (profil == null) return
        yigin.clear(); yigin.add(Ekran.Ana)
        sekme = when (sekmeAdi) { "ilanlar" -> 0; "profil" -> 2; else -> 1 }
        if (ilanId != null) yigin.add(Ekran.IlanAyrinti(ilanId, poz, disaridan = true))
    }

    // Konfeti: bilgiler kaydedilince uygun pozisyon varsa bir kez
    var konfeti by mutableStateOf(0); private set

    // ---------- Anonim istatistik (ilk açılışta bir kez sorulur) ----------
    var istatistikSoruldu by mutableStateOf(Istatistik.soruldu); private set
    var istatistikIzin by mutableStateOf(Istatistik.izin); private set
    fun istatistikSec(evet: Boolean) {
        Istatistik.izinVer(evet); istatistikSoruldu = true; istatistikIzin = evet
        if (evet) { Istatistik.olay("istatistik_acildi"); profil?.let { p -> sonuc?.let { s -> Istatistik.profil(p, s.say("uygun"), s.say("bak")) } } }
    }
    private fun HesapSonuc.say(g: String) = ilanlar.sumOf { x -> x.pozisyonlar.count { it.grup == g } }
    fun ilanAcildi(x: Ilan, z: Pozisyon?) = Istatistik.olay("ilan_acildi", "kurum" to x.kurumKisa, "konu" to (z?.ad ?: x.konuKisa), "sonuc" to (z?.grup ?: "ilan"))

    // ---------- Gezinme ----------
    fun git(e: Ekran) { yigin.add(e) }
    fun geri(): Boolean {
        if (yigin.size <= 1) return false
        val cikan = yigin.removeAt(yigin.lastIndex)
        if (cikan is Ekran.IlanAyrinti && profil != null)
            runCatching { ReklamKurali.ayrintidanDonuldu(kotlinx.datetime.Clock.System.now().toEpochMilliseconds(), cikan.disaridan) }
        return true
    }
    fun sihirbazAc(adim: Int = 0) { taslak = profil ?: Profil(); git(Ekran.Sihirbaz(adim)); sayacGuncelle(); Istatistik.olay("bilgi_girisi_basladi", "ilk" to (profil == null).toString()) }
    fun adimDegis(adim: Int) { yigin[yigin.lastIndex] = Ekran.Sihirbaz(adim); Istatistik.olay("bilgi_girisi_adim", "adim" to (adim + 1).toString()) }

    // ---------- Sihirbaz ----------
    fun taslakDegis(yeni: Profil) { taslak = yeni; sayacGuncelle() }
    private fun sayacGuncelle() {
        sayacIs?.cancel()
        sayacIs = kapsam.launch { delay(150); sayac = runCatching { cekirdek.say(taslak.copy(genel = taslak.genel != false)) }.getOrNull() }
    }
    fun profilKaydet() {
        val p = taslak.copy(ad = "Ben", genel = taslak.genel != false)
        val ilkKez = profil == null
        profil = p; Depo.yaz("profil", JSON.encodeToString(Profil.serializer(), p))
        yigin.clear(); yigin.add(Ekran.Ana); sekme = 1
        kapsam.launch {
            hesapla()
            sonuc?.let { s -> Istatistik.profil(p, s.say("uygun"), s.say("bak")) }
            if ((sonuc?.ilanlar?.sumOf { x -> x.pozisyonlar.count { it.grup == "uygun" } } ?: 0) > 0) { konfeti++; runCatching { Telefon.titret() } }
            // İlk kayıtta bir kez bildirim izni sorulur (eski sürümdeki gibi)
            if (ilkKez && Depo.oku("bildirim") == null) bildirimDegis(true)
        }
    }
    fun profilSil() {
        profil = null; taslak = Profil(); Depo.yaz("profil", null); Depo.yaz("takip", null); Depo.yaz("hazirlik", null)
        Depo.yaz("bildirilen", null); Depo.yaz("hatirlatilan", null); Depo.yaz("bildirim", null); Depo.yaz("sonDenetim", null)
        bildirimAcik = false; runCatching { Telefon.denetimKur(false) }
        takip = emptyMap(); hazirlik = emptyMap()
        yigin.clear(); yigin.add(Ekran.Karsilama)
        kapsam.launch { hesapla() }
    }

    // ---------- Takip / hazırlık ----------
    fun takipYaz(anahtar: String, d: String?) {
        tumPozisyonlar().firstOrNull { it.second.anahtar == anahtar }?.let { (x, z) ->
            Istatistik.olay(if (d == null) "takip_birakildi" else d, "kurum" to x.kurumKisa, "konu" to z.ad)
        }
        takip = takip.toMutableMap().apply { if (d == null) remove(anahtar) else put(anahtar, d) }
        Depo.yaz("takip", JSON.encodeToString(MapSerializer(String.serializer(), String.serializer()), takip))
    }
    fun belgeDegis(ilanId: String, belgeId: String) {
        val s = (hazirlik[ilanId] ?: emptyList()).toMutableSet().apply { if (!add(belgeId)) remove(belgeId) }
        hazirlik = hazirlik.toMutableMap().apply { put(ilanId, s.toList()) }
        Depo.yaz("hazirlik", JSON.encodeToString(MapSerializer(String.serializer(), ListSerializer(String.serializer())), hazirlik))
    }
    fun temaDegis(t: String) { tema = t; Depo.yaz("tema", t) }

    private fun haritaOku(k: String): Map<String, String> =
        Depo.oku(k)?.let { runCatching { JSON.decodeFromString(MapSerializer(String.serializer(), String.serializer()), it) }.getOrNull() } ?: emptyMap()

    // ---------- Kolaylıklar ----------
    fun tumPozisyonlar(): List<Pair<Ilan, Pozisyon>> = sonuc?.ilanlar.orEmpty().flatMap { x -> x.pozisyonlar.map { x to it } }
    fun ilan(id: String) = sonuc?.ilanlar?.firstOrNull { it.id == id }

    // En sonda: tüm alanlar hazır olduktan sonra başlar
    init { kapsam.launch { baslat() } }
}
