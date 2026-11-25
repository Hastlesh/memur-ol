package com.celikgames.memurol

/** Telefona özgü istatistik aracı (Android: Firebase Analytics). İzin yoksa hiçbir şey göndermez. */
expect object Analitik {
    fun etkin(acik: Boolean)
    fun olay(ad: String, prm: Map<String, String>)
    fun ozellik(ad: String, deger: String?)
}

/**
 * Anonim kullanım istatistikleri — yalnız kullanıcı "Evet" dediyse (Depo "istatistik" = "evet").
 * KİŞİYİ TANITAN HİÇBİR ŞEY GÖNDERİLMEZ: isim, kesin doğum tarihi, tam puan, kimlik yok.
 * Gidenler kaba gruplardır: yaş aralığı, okul düzeyi, bölüm, il, cinsiyet, puan aralığı, ehliyet var/yok.
 */
object Istatistik {
    val soruldu get() = Depo.oku("istatistik") != null
    val izin get() = Depo.oku("istatistik") == "evet"

    fun izinVer(evet: Boolean) {
        Depo.yaz("istatistik", if (evet) "evet" else "hayir")
        runCatching { Analitik.etkin(evet) }
    }

    fun olay(ad: String, vararg prm: Pair<String, String?>) {
        if (!izin) return
        runCatching { Analitik.olay(ad, prm.filter { it.second != null }.associate { it.first to it.second!!.take(100) }) }
    }

    /** Profil kaydedilince: kaba gruplar (kullanıcı özellikleri; Firebase sınırı 36 karakter) */
    fun profil(p: Profil, uygun: Int, kontrol: Int) {
        if (!izin) return
        val o = mapOf(
            "yas_araligi" to yasAraligi(p.dogum),
            "okul" to mapOf(2 to "lise", 3 to "onlisans", 4 to "lisans", 5 to "yukseklisans")[p.okul],
            "bolum" to p.bolum?.takeIf { it.isNotBlank() }?.take(36),
            "il" to p.ikamet?.takeIf { it.isNotBlank() },
            "cinsiyet" to p.cinsiyet,
            "kpss_araligi" to puanAraligi(p),
            "ehliyet" to if (p.ehliyet.isNullOrBlank()) "yok" else "var",
            "uygun_araligi" to aralik(uygun),
        )
        o.forEach { (k, v) -> runCatching { Analitik.ozellik(k, v) } }
        olay("profil_kaydedildi", "uygun_araligi" to aralik(uygun), "kontrol_araligi" to aralik(kontrol), "okul" to o["okul"])
    }

    private fun aralik(n: Int) = when { n == 0 -> "0"; n <= 3 -> "1-3"; n <= 10 -> "4-10"; else -> "11+" }

    private fun yasAraligi(dogum: String?): String? {
        val y = dogum?.take(4)?.toIntOrNull() ?: return null
        val yas = bugunTr().year - y
        return when { yas < 18 -> "18 alti"; yas <= 24 -> "18-24"; yas <= 29 -> "25-29"; yas <= 34 -> "30-34"; yas <= 39 -> "35-39"; else -> "40+" }
    }

    private fun puanAraligi(p: Profil): String? {
        if (p.puanYok == true) return "puan yok"
        val e = p.puanlar.mapNotNull { it.puan.replace(',', '.').toDoubleOrNull() }.maxOrNull() ?: return null
        val alt = (e / 10).toInt() * 10
        return "$alt-${alt + 10}"
    }
}
