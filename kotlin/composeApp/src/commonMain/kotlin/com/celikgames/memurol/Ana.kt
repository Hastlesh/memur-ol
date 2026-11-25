package com.celikgames.memurol

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ListAlt
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.ceil
import kotlin.math.roundToInt
import kotlinx.datetime.plus

@Composable
fun AnaEkran(d: UygulamaDurum) {
    Scaffold(
        bottomBar = {
            Column {
            // Şerit reklam: yalnız liste ekranlarında, alt menünün hemen üstünde (bilgi girişi ve ilan ayrıntısında yok)
            if (d.profil != null) ReklamSeridi()
            NavigationBar {
                listOf(Triple("İlanlar", Icons.AutoMirrored.Rounded.ListAlt, 0), Triple("Sana uygun", Icons.Rounded.TaskAlt, 1), Triple("Profil", Icons.Rounded.Person, 2)).forEach { (ad, ik, i) ->
                    NavigationBarItem(d.sekme == i, { d.sekme = i }, { Icon(ik, null) }, label = { Text(ad) })
                }
            }
            }
        },
    ) { ic ->
        Column(Modifier.padding(ic).fillMaxSize()) {
            // Sonuç varsa hata yalnız ince bir uyarı şeridi; sonuç hiç yoksa açıklama + yeniden dene
            if (d.hata != null && d.sonuc != null) Text(d.hata!!, Modifier.fillMaxWidth().background(LocalDurum.current.bakZemin).statusBarsPadding().padding(12.dp),
                color = LocalDurum.current.bak, fontSize = 13.sp)
            Box(Modifier.weight(1f).fillMaxWidth()) {
                when {
                    d.sonuc == null && d.hata != null -> Column(Modifier.padding(24.dp).statusBarsPadding(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Baslik("Bir sorun var"); Soluk(d.hata!!); Button(onClick = { d.yenileBaslat() }) { Text("Yeniden dene") }
                    }
                    d.sonuc == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                    d.sekme == 0 -> IlanlarSekmesi(d)
                    d.sekme == 1 -> UygunSekmesi(d)
                    else -> ProfilSekmesi(d)
                }
            }
        }
    }
}

@Composable
private fun UstSatir(d: UygulamaDurum) {
    Row(Modifier.fillMaxWidth().statusBarsPadding().padding(start = 16.dp, end = 8.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.weight(1f)) { Marka() }
        if (d.yukleniyor) CircularProgressIndicator(Modifier.size(22.dp).padding(2.dp), strokeWidth = 2.dp)
        else IconButton(onClick = { d.yenileBaslat() }) { Icon(Icons.Rounded.Refresh, "İlanları yenile") }
    }
}

// ---------------- Sana uygun ----------------
@Composable
private fun UygunSekmesi(d: UygulamaDurum) {
    val s = d.sonuc ?: return
    val P = d.tumPozisyonlar()
    val uygun = P.filter { it.second.grup == "uygun" }; val bak = P.filter { it.second.grup == "bak" }; val yok = P.count { it.second.grup == "uymuyor" }
    val takipte = P.filter { d.takip.containsKey(it.second.anahtar) }
    Box {
    LazyColumn(contentPadding = PaddingValues(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { UstSatir(d) }
        item { OzetKahraman(uygun.size, bak.size, yok, s.ilanlar.size) }
        item { SonGunlerKart(d, P) }
        if (s.profil.doluluk < 100 || s.profil.eksikler.isNotEmpty()) item { TamlikKart(d, s.profil) }
        if (takipte.isNotEmpty()) { item { Bolum("Takip ettiklerin", takipte.size) }; items(takipte, key = { "t" + it.second.anahtar }) { (x, z) -> PozKart(d, x, z) } }
        item { Bolum("Sana uygun", uygun.size) }
        if (uygun.isEmpty()) item { Kart(Modifier.padding(horizontal = 16.dp)) { Soluk("Şu an tüm şartları tuttuğun pozisyon yok. Aşağıdaki kontrol listesine ve profilindeki eksik bilgilere bak.") } }
        items(uygun, key = { "u" + it.second.anahtar }) { (x, z) -> PozKart(d, x, z) }
        if (bak.isNotEmpty()) { item { Bolum("Kontrol etmen gerekenler", bak.size) }; items(bak, key = { "b" + it.second.anahtar }) { (x, z) -> PozKart(d, x, z) } }
        if (s.profil.engeller.isNotEmpty()) item { EngelKart(s.profil.engeller) }
        if (s.profil.hedefPuan.isNotEmpty() && s.profil.enYuksekPuan > 0) item { HedefKart(s.profil) }
    }
    Konfeti(d.konfeti)
    }
}

/** Önümüzdeki 14 gün: her gün kaç pozisyonun son günü (uygun/kontrol/takip; başvurulanlar hariç). Güne dokununca o günün pozisyonları. */
@Composable
private fun SonGunlerKart(d: UygulamaDurum, P: List<Pair<Ilan, Pozisyon>>) {
    val bugun = remember { bugunTr() }
    val harita = remember(P, d.takip) {
        P.filter { (x, z) -> (z.grup != "uymuyor" || d.takip[z.anahtar] == "takip") && d.takip[z.anahtar] != "basvurdum" && x.sure.son != null && x.sure.kod != "acilmadi" }
            .groupBy { gunTr(it.first.sure.son) }
    }
    val gunler = remember(bugun) { (0 until 14).map { bugun.plus(kotlinx.datetime.DatePeriod(days = it)) } }
    if (gunler.none { harita[it] != null }) return
    var secili by remember(harita) { mutableStateOf(gunler.first { harita[it] != null }) }
    val dr = LocalDurum.current
    val GUN = listOf("Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz")
    Kart(Modifier.padding(horizontal = 16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(Icons.Rounded.CalendarMonth, null, tint = MaterialTheme.colorScheme.primary); Baslik("Yaklaşan son günler")
        }
        androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            items(gunler) { g ->
                val n = harita[g]?.size ?: 0; val sec = g == secili
                Column(Modifier.width(46.dp).clip(RoundedCornerShape(12.dp))
                    .background(when { sec -> MaterialTheme.colorScheme.primary; n > 0 -> MaterialTheme.colorScheme.primaryContainer; else -> MaterialTheme.colorScheme.surfaceVariant })
                    .then(if (n > 0) Modifier.clickableNoRipple { secili = g } else Modifier).padding(vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally) {
                    val yz = if (sec) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                    Text(GUN[g.dayOfWeek.ordinal], fontSize = 11.sp, color = yz.copy(alpha = .75f))
                    Text("${g.dayOfMonth}", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = yz)
                    Text(if (n > 0) "$n" else "·", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (sec) yz else if (n > 0) dr.mercan else yz.copy(alpha = .4f))
                }
            }
        }
        val L = harita[secili].orEmpty()
        Soluk("${secili.dayOfMonth} ${AYLAR[secili.monthNumber - 1]}: ${L.size} pozisyonun son günü")
        L.take(6).forEach { (x, z) ->
            Row(Modifier.fillMaxWidth().clickableNoRipple { d.git(Ekran.IlanAyrinti(x.id, z.anahtar)) }.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                DurumHap(z.grup, if (z.grup == "uygun") "Uygun" else if (z.grup == "bak") "Kontrol" else "Takip")
                Text(z.ad + " · " + x.kurumKisa, Modifier.weight(1f), fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@Composable
private fun OzetKahraman(u: Int, b: Int, y: Int, ilan: Int) {
    val dr = LocalDurum.current
    Box(Modifier.padding(horizontal = 16.dp).fillMaxWidth().clip(RoundedCornerShape(24.dp))
        .background(Brush.linearGradient(listOf(dr.markaUst, Color(0xFF4A24B8), dr.markaAlt))).padding(20.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(18.dp)) {
            // Sayı 0'dan yukarı sayarak gelir (eski sürümdeki sayaç efekti)
            var hedef by remember { mutableStateOf(0) }
            LaunchedEffect(u) { hedef = u }
            val gosterilen by androidx.compose.animation.core.animateIntAsState(hedef, androidx.compose.animation.core.tween(700))
            Halka(listOf(u to Color(0xFF86E8D8), b to Color(0xFFFFB13D)), 104.dp, 12.dp, Color.White.copy(alpha = .18f)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("$gosterilen", color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold); Text("uygun", color = Color.White.copy(.85f), fontSize = 12.sp)
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("$ilan açık ilan tarandı", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                Text("$b pozisyonda kontrol etmen gereken şart var", color = Color.White.copy(.9f), fontSize = 14.sp)
                Text("$y pozisyon sana uymuyor", color = Color.White.copy(.75f), fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun Bolum(ad: String, n: Int) = Row(Modifier.padding(start = 20.dp, end = 20.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
    Text(ad, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f)); Soluk("$n")
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TamlikKart(d: UygulamaDurum, o: ProfilOzet) {
    Kart(Modifier.padding(horizontal = 16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) { Text("Profil %${o.doluluk}", fontWeight = FontWeight.Bold, modifier = Modifier.width(96.dp)); Cubuk(o.doluluk / 100f, MaterialTheme.colorScheme.primary) }
        val alanlar = (o.eksikler + o.bos.filter { b -> o.eksikler.none { it.alan == b.alan } })
        if (alanlar.isNotEmpty()) {
            Soluk("Eksik bilgiler — dokun, doldur. Sayı: etkilediği pozisyon.")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                alanlar.forEach { e -> AssistChip({ d.sihirbazAc(e.adim - 1) }, { Text(if (e.etkiledigi > 0) "${e.ad} · ${e.etkiledigi}" else e.ad) }, leadingIcon = { Icon(Icons.Rounded.Add, null, Modifier.size(16.dp)) }) }
            }
        }
    }
}

@Composable
private fun EngelKart(E: List<Engel>) {
    Kart(Modifier.padding(horizontal = 16.dp)) {
        Baslik("Seni en çok engelleyen")
        val en = E.first().n.coerceAtLeast(1)
        E.take(4).forEach { e ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(e.ad, Modifier.width(130.dp), fontSize = 14.sp); Cubuk(e.n.toFloat() / en, LocalDurum.current.yok, Modifier.weight(1f)); Text("${e.n}", fontWeight = FontWeight.Bold)
            }
        }
        Soluk("Uymayan pozisyon sayısı")
    }
}

@Composable
private fun HedefKart(o: ProfilOzet) {
    Kart(Modifier.padding(horizontal = 16.dp)) {
        Baslik("Puanın yükselirse")
        Soluk("Şu an ${o.enYuksekPuan.toString().replace('.', ',')} · sadece puan yüzünden kaçan pozisyonlar")
        val esikler = o.hedefPuan.map { ceil(it.puan).toInt() }.distinct().take(4)
        esikler.forEach { e ->
            val n = o.hedefPuan.count { it.puan <= e }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("$e", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = MaterialTheme.colorScheme.primary)
                Text("puanla +$n pozisyon açılır", Modifier.weight(1f))
                Soluk("+" + ((e - o.enYuksekPuan) * 10).roundToInt().div(10.0).toString().replace('.', ','))
            }
        }
    }
}

@Composable
fun PozKart(d: UygulamaDurum, x: Ilan, z: Pozisyon) {
    val dr = LocalDurum.current
    Kart(Modifier.padding(horizontal = 16.dp), tikla = { d.git(Ekran.IlanAyrinti(x.id, z.anahtar)) }) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            DurumHap(z.grup)
            val t = d.takip[z.anahtar]
            if (t != null) DurumHap("bak", if (t == "basvurdum") "Başvurdun" else "Takipte")
            Spacer(Modifier.weight(1f))
            Text(kalanYaz(x.sure), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = if (x.sure.kod in setOf("bugun", "az")) dr.mercan else MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(z.ad, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
        Soluk(x.kurumKisa + (z.adet?.let { " · ${kisiYaz(it)} kişi" } ?: "") + (z.ildeki?.let { " · seçtiğin illerde $it" } ?: ""))
        if (z.grup != "uygun" && z.neden.isNotBlank()) Text(z.neden, fontSize = 13.sp, color = if (z.grup == "uymuyor") dr.yok else dr.bak, maxLines = 2, overflow = TextOverflow.Ellipsis)
    }
}

// ---------------- İlanlar ----------------
@Composable
private fun IlanlarSekmesi(d: UygulamaDurum) {
    val s = d.sonuc ?: return
    var ara by remember { mutableStateOf("") }
    var bana by remember { mutableStateOf(false) }
    val q = ara.trim().lowercase()
    val L = s.ilanlar.filter { x ->
        (q.isEmpty() || (x.kurum + " " + x.konu + " " + x.pozisyonlar.joinToString(" ") { it.ad }).lowercase().contains(q)) &&
            (!bana || x.pozisyonlar.any { it.grup != "uymuyor" })
    }.sortedWith(compareBy({ it.sure.son ?: "9999" }))
    LazyColumn(contentPadding = PaddingValues(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { UstSatir(d) }
        item {
            Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(ara, { ara = it }, Modifier.fillMaxWidth(), placeholder = { Text("Kurum, kadro ara (ör. zabıta, Ankara)") },
                    leadingIcon = { Icon(Icons.Rounded.Search, null) }, singleLine = true, shape = RoundedCornerShape(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    FilterChip(!bana, { bana = false }, { Text("Hepsi · ${s.ilanlar.size}") })
                    FilterChip(bana, { bana = true }, { Text("Bana uyanlar") })
                    Spacer(Modifier.weight(1f))
                    Soluk(when (d.kaynak) { "canli" -> "Güncel"; "onbellek" -> "Çevrimdışı"; else -> "Kayıtlı liste" })
                }
            }
        }
        if (L.isEmpty()) item { Soluk("Aramana uyan açık ilan yok.", Modifier.padding(20.dp)) }
        items(L, key = { it.id }) { x -> IlanKart(d, x) }
        item { Soluk(RESMI_DEGIL, Modifier.padding(20.dp)) }
    }
}

@Composable
private fun IlanKart(d: UygulamaDurum, x: Ilan) {
    val u = x.pozisyonlar.count { it.grup == "uygun" }; val b = x.pozisyonlar.count { it.grup == "bak" }
    val dr = LocalDurum.current
    Kart(Modifier.padding(horizontal = 16.dp), tikla = { d.git(Ekran.IlanAyrinti(x.id)) }) {
        Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            TarihKutusu(x.sure)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(x.kurumKisa, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Soluk(x.konuKisa + (x.ozet.kisi?.let { " · ${kisiYaz(it)} kişi" } ?: ""))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (u > 0) DurumHap("uygun", "$u uygun")
                    if (b > 0) DurumHap("bak", "$b kontrol")
                    if (u == 0 && b == 0) DurumHap("uymuyor", "Uymuyor")
                }
            }
        }
        Text(kalanYaz(x.sure), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = if (x.sure.kod in setOf("bugun", "az")) dr.mercan else MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private val AYK = listOf("OCA", "ŞUB", "MAR", "NİS", "MAY", "HAZ", "TEM", "AĞU", "EYL", "EKİ", "KAS", "ARA")

@Composable
fun TarihKutusu(s: Sure) {
    val dr = LocalDurum.current
    val acil = s.kod in setOf("bugun", "az")
    val p = s.son?.take(10)?.split("-")
    Column(Modifier.width(54.dp).clip(RoundedCornerShape(14.dp)).background(if (acil) dr.yokZemin else MaterialTheme.colorScheme.primaryContainer).padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally) {
        if (p != null && p.size == 3) {
            Text(p[2].trimStart('0'), fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = if (acil) dr.yok else MaterialTheme.colorScheme.primary)
            Text(AYK.getOrElse(p[1].toInt() - 1) { "" }, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (acil) dr.yok else MaterialTheme.colorScheme.primary)
        } else Text("?", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
    }
}

// ---------------- Profil ----------------
@Composable
private fun ProfilSekmesi(d: UygulamaDurum) {
    val p = d.profil ?: Profil()
    var silSor by remember { mutableStateOf(false) }
    LazyColumn(contentPadding = PaddingValues(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { UstSatir(d) }
        item {
            Kart(Modifier.padding(horizontal = 16.dp)) {
                Baslik("Bilgilerin")
                val okul = mapOf(2 to "Lise", 3 to "Ön lisans", 4 to "Lisans", 5 to "Yüksek lisans")[p.okul] ?: "—"
                Satir("Okul", okul + (p.bolum?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""))
                Satir("KPSS", if (p.puanYok == true) "Henüz yok" else p.puanlar.filter { it.puan.isNotBlank() }.joinToString { "${it.tur} ${it.puan.replace('.', ',')} (${it.yil})" }.ifBlank { "—" })
                Satir("Doğum", p.dogum?.split("-")?.reversed()?.joinToString(".") ?: "—")
                Satir("İl", p.ikamet?.ifBlank { null } ?: "—")
                Satir("Ehliyet", p.ehliyet?.ifBlank { "Yok" } ?: "—")
                Button(onClick = { d.sihirbazAc(0) }, Modifier.fillMaxWidth()) { Icon(Icons.Rounded.Edit, null); Spacer(Modifier.width(8.dp)); Text("Bilgilerimi düzenle") }
            }
        }
        item {
            Kart(Modifier.padding(horizontal = 16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Baslik("Bildirimler")
                        Soluk("Sana uygun yeni ilan çıkınca ve takip ettiğin ilanların son gününde haber verir. 3 saatte bir, internet varken kontrol edilir.")
                    }
                    Switch(d.bildirimAcik, { d.bildirimDegis(it) })
                }
                zamanTr(d.sonDenetim)?.let { Soluk("Son arka plan kontrolü: $it") }
            }
        }
        item {
            Kart(Modifier.padding(horizontal = 16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Baslik("Anonim istatistik")
                        Soluk("Uygulamayı geliştirmemiz için yaş aralığı, okul düzeyi, bölüm, il ve hangi ilanlara bakıldığı gibi bilgiler, adın ve kesin doğum tarihin olmadan gönderilir.")
                    }
                    Switch(d.istatistikIzin, { d.istatistikSec(it) })
                }
            }
        }
        item {
            Kart(Modifier.padding(horizontal = 16.dp)) {
                Baslik("Görünüm")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("oto" to "Otomatik", "acik" to "Açık", "koyu" to "Koyu").forEach { (k, ad) -> FilterChip(d.tema == k, { d.temaDegis(k) }, { Text(ad) }) }
                }
            }
        }
        item {
            Kart(Modifier.padding(horizontal = 16.dp)) {
                OutlinedButton(onClick = { Istatistik.olay("paylasim"); paylas("Memur Ol: okulunu ve KPSS puanını gir, açık kamu ilanlarından sana uyanları şart şart göstersin. Ücretsiz, hesap yok.\n$SITE") }, Modifier.fillMaxWidth()) {
                    Icon(Icons.Rounded.Share, null); Spacer(Modifier.width(8.dp)); Text("Uygulamayı paylaş")
                }
                OutlinedButton(onClick = { disAc(SITE + "gizlilik.html") }, Modifier.fillMaxWidth()) { Text("Gizlilik politikası") }
                TextButton(onClick = { if (silSor) d.profilSil() else silSor = true }, Modifier.fillMaxWidth(), colors = ButtonDefaults.textButtonColors(contentColor = LocalDurum.current.yok)) {
                    Text(if (silSor) "Emin misin? Silmek için tekrar dokun" else "Bilgilerimi sil")
                }
            }
        }
        item {
            Kart(Modifier.padding(horizontal = 16.dp)) {
                Baslik("Hakkında"); Soluk(RESMI_DEGIL)
                listOf("Resmî Gazete — Çeşitli İlanlar" to "https://www.resmigazete.gov.tr", "Kariyer Kapısı — Kamu İşe Alım" to "https://kariyerkapisi.gov.tr/isealim", "ÖSYM — KPSS sonuçları" to "https://www.osym.gov.tr")
                    .forEach { (ad, a) -> TextButton(onClick = { disAc(a) }) { Text(ad) } }
                d.guncel?.let { Soluk("İlan listesi: $it") }
            }
        }
    }
}

@Composable
private fun Satir(ad: String, deger: String) = Row { Soluk(ad, Modifier.width(80.dp)); Text(deger, Modifier.weight(1f), fontSize = 14.sp) }
