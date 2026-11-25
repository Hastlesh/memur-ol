package com.celikgames.memurol

import kotlinx.datetime.Clock
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.plus
import kotlinx.datetime.toLocalDateTime
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer

/** Telefonda gösterilecek bir bildirim. Dokununca: tek pozisyonsa onun ayrıntısı, birden çoksa "Sana uygun". */
data class Bildirim(val baslik: String, val metin: String, val ilanId: String? = null, val poz: String? = null)

private val TR = TimeZone.of("Europe/Istanbul")
fun bugunTr(): LocalDate = Clock.System.now().toLocalDateTime(TR).date
/** ISO zaman → Türkiye saatine göre gün */
fun gunTr(iso: String?): LocalDate? = iso?.let { runCatching { Instant.parse(it).toLocalDateTime(TR).date }.getOrNull() }

/** ISO zaman → "25 Kas 16:55" (Türkiye saati) */
fun zamanTr(iso: String?): String? = iso?.let { runCatching { val z = Instant.parse(it).toLocalDateTime(TR)
    "${z.dayOfMonth} ${AYLAR[z.monthNumber - 1]} ${z.hour.toString().padStart(2, '0')}:${z.minute.toString().padStart(2, '0')}" }.getOrNull() }

private val LISTE = ListSerializer(String.serializer())
private fun liste(k: String): List<String> = Depo.oku(k)?.let { runCatching { JSON.decodeFromString(LISTE, it) }.getOrNull() } ?: emptyList()
private fun yazListe(k: String, L: List<String>) = Depo.yaz(k, JSON.encodeToString(LISTE, L))

/**
 * Arka plan denetimi (uygulama.html arkaIs ile aynı kurallar):
 *  1) Daha önce gösterilmemiş uygun / kontrol pozisyonu → "Sana uygun yeni ilan"
 *  2) Takip edilen ya da uygun olup başvurulmamış pozisyon: son günden bir gün önce ve son gün
 *  3) Başvuruların açıldığı gün (bir kez)
 * Görülenler 'bildirilen', hatırlatılanlar 'hatirlatilan' anahtarında saklanır; aynı şey iki kez bildirilmez.
 */
object Denetim {
    fun isaretle(s: HesapSonuc) {
        val g = liste("bildirilen").toMutableSet()
        s.ilanlar.forEach { x -> x.pozisyonlar.filter { it.grup != "uymuyor" }.forEach { g.add(it.anahtar) } }
        yazListe("bildirilen", g.toList().takeLast(4000))
    }

    suspend fun calistir(c: Cekirdek, p: Profil, s: HesapSonuc): List<Bildirim> {
        val B = mutableListOf<Bildirim>()
        val ad: (Ilan, Pozisyon) -> String = { x, z -> (if (z.i >= 0) z.ad else x.konuKisa) + " · " + x.kurumKisa }
        val hedef: (List<Pair<Ilan, Pozisyon>>) -> Pair<String?, String?> = { L -> if (L.size == 1) L[0].first.id to L[0].second.anahtar else null to null }
        val ilgili = s.ilanlar.flatMap { x -> x.pozisyonlar.filter { it.grup != "uymuyor" }.map { x to it } }

        // 1) Yeni ilanlar (ilk çalışmada yalnız işaretlenir, bildirilmez)
        val once = Depo.oku("bildirilen")
        if (once != null) {
            val gorulen = liste("bildirilen").toSet()
            val U = ilgili.filter { it.second.grup == "uygun" && it.second.anahtar !in gorulen }
            val K = ilgili.filter { it.second.grup == "bak" && it.second.anahtar !in gorulen }
            if (U.isNotEmpty()) {
                val (i, z) = hedef(U)
                B += Bildirim(if (U.size == 1) "Sana uygun yeni ilan" else "Sana uygun ${U.size} yeni ilan",
                    U.take(4).joinToString("\n") { ad(it.first, it.second) } + if (K.isNotEmpty()) "\n+${K.size} ilanda şartlarına bakmalısın" else "", i, z)
            } else if (K.isNotEmpty()) {
                val (i, z) = hedef(K)
                B += Bildirim(if (K.size == 1) "Yeni ilan: şartlarına bak" else "${K.size} yeni ilan: şartlarına bak", K.take(4).joinToString("\n") { ad(it.first, it.second) }, i, z)
            }
        }
        isaretle(s)

        // 2) Son gün hatırlatması  3) Başvurular bugün açıldı
        val takip = Depo.oku("takip")?.let { runCatching { JSON.decodeFromString(MapSerializer(String.serializer(), String.serializer()), it) }.getOrNull() } ?: emptyMap()
        val hazirlik = Depo.oku("hazirlik")?.let { runCatching { JSON.decodeFromString(MapSerializer(String.serializer(), LISTE), it) }.getOrNull() } ?: emptyMap()
        val H = liste("hatirlatilan").toMutableSet()
        val bugun = bugunTr(); val yarin = bugun.plus(DatePeriod(days = 1))
        val izlenen = s.ilanlar.flatMap { x -> x.pozisyonlar.map { x to it } }.filter { (_, z) -> val d = takip[z.anahtar]; d == "takip" || (z.grup == "uygun" && d != "basvurdum") }
        suspend fun eksikBelge(L: List<Pair<Ilan, Pozisyon>>): String {
            var e = 0
            for (x in L.map { it.first }.distinctBy { it.id }) { val b = runCatching { c.ayrinti(x.id, null).belgeler }.getOrDefault(emptyList()); val h = hazirlik[x.id].orEmpty().toSet(); e += b.count { it.id !in h } }
            return if (e > 0) "\nHazırlık listende $e belge işaretlenmedi." else ""
        }
        for ((gun, baslik) in listOf(bugun to "Bugün son gün", yarin to "Yarın son gün")) {
            val L = izlenen.filter { (x, z) -> gunTr(x.sure.son) == gun && "${z.anahtar}|$gun" !in H }
            if (L.isEmpty()) continue
            val (i, z) = hedef(L)
            B += Bildirim(baslik + if (L.size > 1) " (${L.size} ilan)" else "",
                L.map { ad(it.first, it.second) }.distinct().take(4).joinToString("\n") + eksikBelge(L) + "\nBaşvurduysan uygulamada \"Başvurdum\" de.", i, z)
            L.forEach { H.add("${it.second.anahtar}|$gun") }
        }
        val acilan = izlenen.filter { (x, z) -> gunTr(x.sure.bas) == bugun && "${z.anahtar}|ac" !in H }
        if (acilan.isNotEmpty()) {
            val (i, z) = hedef(acilan)
            B += Bildirim(if (acilan.size == 1) "Başvurular bugün açıldı" else "${acilan.size} ilanda başvurular bugün açıldı",
                acilan.map { ad(it.first, it.second) }.distinct().take(4).joinToString("\n") + eksikBelge(acilan), i, z)
            acilan.forEach { H.add("${it.second.anahtar}|ac") }
        }
        yazListe("hatirlatilan", H.toList().takeLast(600))
        Depo.yaz("sonDenetim", Clock.System.now().toString())
        return B.take(3)   // en çok 3 bildirim (eski sürümdeki sınır)
    }

    /** Ana ekran parçacığı için kısa özet: uygun, kontrol, en yakın son gün */
    fun pencereOzeti(s: HesapSonuc?, profilVar: Boolean): PencereOzet {
        if (s == null || !profilVar) return PencereOzet(profilVar = profilVar)
        val P = s.ilanlar.flatMap { x -> x.pozisyonlar.map { x to it } }
        val yakin = P.filter { it.second.grup != "uymuyor" && it.first.sure.son != null && it.first.sure.kod != "acilmadi" }.minByOrNull { it.first.sure.son!! }
        val sonYazi = yakin?.let { (x, _) -> gunTr(x.sure.son)?.let { g -> "${g.dayOfMonth} ${AYLAR[g.monthNumber - 1]} · ${kalanYaz(x.sure)}" } } ?: ""
        return PencereOzet(P.count { it.second.grup == "uygun" }, P.count { it.second.grup == "bak" }, sonYazi,
            yakin?.let { (x, z) -> (if (z.i >= 0) z.ad else x.konuKisa) + " · " + x.kurumKisa } ?: "", true)
    }
}

data class PencereOzet(val uygun: Int = 0, val kontrol: Int = 0, val son: String = "", val ad: String = "", val profilVar: Boolean = false)

val AYLAR = listOf("Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara")
