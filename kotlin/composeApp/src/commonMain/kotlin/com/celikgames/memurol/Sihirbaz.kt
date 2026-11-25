package com.celikgames.memurol

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val ADIMLAR = listOf("Eğitimin", "KPSS puanın", "Seni tanıyalım", "Ehliyet ve belgeler", "Son birkaç soru")
private val SINIF = listOf("A", "A1", "A2", "B", "BE", "C", "C1", "CE", "D", "D1", "DE", "F", "G", "M")

private fun gecerli(adim: Int, p: Profil): Boolean = when (adim) {
    0 -> p.okul != null && (p.okul < 3 || !p.bolum.isNullOrBlank())
    1 -> p.puanYok == true || p.puanlar.any { it.puan.replace(',', '.').toDoubleOrNull() != null }
    2 -> !p.dogum.isNullOrBlank() && p.cinsiyet != null && (p.cinsiyet != "E" || !p.asker.isNullOrBlank())
    else -> true
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SihirbazEkrani(d: UygulamaDurum, adim: Int) {
    val p = d.taslak
    val degis: (Profil) -> Unit = { d.taslakDegis(it) }
    Scaffold(
        topBar = {
            Column(Modifier.statusBarsPadding().padding(horizontal = 8.dp, vertical = 6.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { if (adim > 0) d.adimDegis(adim - 1) else d.geri() }) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Geri") }
                    Row(Modifier.weight(1f).padding(end = 16.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        ADIMLAR.indices.forEach { i ->
                            Box(Modifier.weight(1f).height(6.dp).clip(RoundedCornerShape(3.dp))
                                .background(if (i <= adim) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant))
                        }
                    }
                }
            }
        },
        bottomBar = {
            Column(Modifier.background(MaterialTheme.colorScheme.surface).navigationBarsPadding().imePadding().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                val s = d.sayac
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (s != null) { DurumHap("uygun", "${s.uygun} uygun"); DurumHap("bak", "${s.bak} kontrol") } else Soluk("Hesaplanıyor…")
                }
                Button(onClick = { if (adim < ADIMLAR.lastIndex) d.adimDegis(adim + 1) else d.profilKaydet() },
                    enabled = gecerli(adim, p), modifier = Modifier.fillMaxWidth().height(52.dp)) {
                    Text(if (adim == ADIMLAR.lastIndex) "Sonuçlarımı göster" else "Devam", fontWeight = FontWeight.Bold)
                }
            }
        },
    ) { ic ->
        Column(Modifier.padding(ic).fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)) {
            when (adim) {
                0 -> AdimEgitim(p, d.sabit, degis)
                1 -> AdimKpss(p, d.sabit, degis)
                2 -> AdimKisisel(p, d.sabit, degis)
                3 -> AdimBelge(p, d.sabit, degis)
                else -> AdimSon(p, degis)
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable private fun Soru(metin: String) = Text(metin, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)

@Composable
private fun Alan(baslik: String, ipucu: String? = null, icerik: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(baslik, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.labelLarge)
        icerik(); if (ipucu != null) Soluk(ipucu)
    }
}

/** Büyük seçenek kartları */
@Composable
private fun Secenekler(liste: List<Triple<String, String, String?>>, secili: String?, sec: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        liste.forEach { (v, ad, alt) ->
            val ok = secili == v
            OutlinedCard(onClick = { sec(v) }, Modifier.fillMaxWidth(),
                colors = CardDefaults.outlinedCardColors(containerColor = if (ok) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface),
                border = CardDefaults.outlinedCardBorder().let { if (ok) androidx.compose.foundation.BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else it }) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) { Text(ad, fontWeight = FontWeight.SemiBold); if (alt != null) Soluk(alt) }
                    if (ok) Icon(Icons.Rounded.CheckCircle, null, tint = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Cipler(liste: List<String>, secili: (String) -> Boolean, sec: (String) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        liste.forEach { v -> FilterChip(selected = secili(v), onClick = { sec(v) }, label = { Text(v) }) }
    }
}

@Composable
private fun AdimEgitim(p: Profil, s: Sabitler, degis: (Profil) -> Unit) {
    Soru("En son hangi okulu bitirdin?")
    Secenekler(listOf(Triple("2", "Lise", "Meslek lisesi dahil"), Triple("3", "Ön lisans", "2 yıllık"), Triple("4", "Lisans", "4 yıllık"), Triple("5", "Yüksek lisans", "veya doktora")),
        p.okul?.toString()) { v -> val o = v.toInt(); degis(if (o != p.okul) p.copy(okul = o, bolum = "") else p) }
    val okul = p.okul ?: return
    if (okul < 3) return
    Alan("Bölümün") {
        if (!p.bolum.isNullOrBlank()) {
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.primaryContainer).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Check, null, tint = MaterialTheme.colorScheme.primary); Spacer(Modifier.width(8.dp))
                Text(p.bolum, Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
                TextButton(onClick = { degis(p.copy(bolum = "")) }) { Text("Değiştir") }
            }
        } else {
            var q by remember { mutableStateOf("") }
            OutlinedTextField(q, { q = it }, Modifier.fillMaxWidth(), placeholder = { Text("Bölüm ara…") }, leadingIcon = { Icon(Icons.Rounded.Search, null) }, singleLine = true)
            val liste = s.bolumler[okul.toString()] ?: s.bolumler["4"].orEmpty()
            val k = q.trim().lowercase()
            if (k.length >= 2) {
                Column {
                    liste.filter { it.lowercase().contains(k) }.take(30).forEach { b ->
                        Text(b, Modifier.fillMaxWidth().clickable { degis(p.copy(bolum = b)) }.padding(vertical = 12.dp, horizontal = 4.dp))
                        HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                    }
                    TextButton(onClick = { degis(p.copy(bolum = q.trim())) }) { Icon(Icons.Rounded.Add, null); Text("\"${q.trim()}\" olarak ekle") }
                }
            }
        }
    }
}

@Composable
private fun AdimKpss(p: Profil, s: Sabitler, degis: (Profil) -> Unit) {
    Soru("KPSS puanın var mı?")
    val secili = when { p.puanYok == true -> "1"; p.puanlar.isNotEmpty() -> "0"; else -> null }
    Secenekler(listOf(Triple("0", "Var", null), Triple("1", "Henüz yok", null)), secili) { v ->
        degis(if (v == "1") p.copy(puanYok = true, puanlar = emptyList())
        else p.copy(puanYok = false, puanlar = p.puanlar.ifEmpty { listOf(Puan(tur = s.puanOkul[p.okul.toString()] ?: "P3", puan = "", yil = "2026")) }))
    }
    if (p.puanYok == true || p.puanlar.isEmpty()) return
    val a = p.puanlar[0]
    fun ilk(y: Puan) = degis(p.copy(puanlar = listOf(y) + p.puanlar.drop(1)))
    Alan("Sınav yılı") { Cipler(listOf("2026", "2025", "2024", "2023", "2022"), { it == a.yil }) { ilk(a.copy(yil = it)) } }
    Alan("Puan türü") { Cipler(listOf("P3", "P93", "P94"), { it == a.tur }) { ilk(a.copy(tur = it)) } }
    Alan("Puanın") {
        OutlinedTextField(a.puan.replace('.', ','), { ilk(a.copy(puan = it.replace(',', '.').trim())) }, Modifier.fillMaxWidth(),
            placeholder = { Text("00,00") }, singleLine = true, textStyle = MaterialTheme.typography.headlineMedium,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
    }
    p.puanlar.drop(1).forEachIndexed { i, x ->
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            fun guncelle(y: Puan) = degis(p.copy(puanlar = p.puanlar.toMutableList().also { it[i + 1] = y }))
            OutlinedTextField(x.tur, { guncelle(x.copy(tur = it.uppercase())) }, Modifier.weight(1f), label = { Text("Tür") }, singleLine = true)
            OutlinedTextField(x.puan, { guncelle(x.copy(puan = it.replace(',', '.'))) }, Modifier.weight(1f), label = { Text("Puan") }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
            OutlinedTextField(x.yil, { guncelle(x.copy(yil = it)) }, Modifier.weight(1f), label = { Text("Yıl") }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
            IconButton(onClick = { degis(p.copy(puanlar = p.puanlar.toMutableList().also { it.removeAt(i + 1) })) }) { Icon(Icons.Rounded.Close, "Sil") }
        }
    }
    TextButton(onClick = { degis(p.copy(puanlar = p.puanlar + Puan(tur = "P1", puan = "", yil = a.yil))) }) { Icon(Icons.Rounded.Add, null); Text("Başka puan türü (P1, P2…)") }
}

@Composable
private fun AdimKisisel(p: Profil, s: Sabitler, degis: (Profil) -> Unit) {
    Soru("Seni biraz tanıyalım")
    Alan("Cinsiyet") { Secenekler(listOf(Triple("K", "Kadın", null), Triple("E", "Erkek", null)), p.cinsiyet) { degis(p.copy(cinsiyet = it, asker = if (it != "E") "" else p.asker)) } }
    Alan("Doğum tarihi", "Gün.Ay.Yıl, örnek 01.11.1997") { TarihAlani(p.dogum) { degis(p.copy(dogum = it)) } }
    Alan("Yaşadığın il", "İkamet şartı olan ilanlar için (isteğe bağlı)") { IlSecici(p.ikamet, s.iller) { degis(p.copy(ikamet = it)) } }
    if (p.cinsiyet == "E") Alan("Askerlik") {
        val L = listOf("yapti" to "Yaptım", "muaf" to "Muafım", "tecilli" to "Tecilli", "yapmadi" to "Yapmadım")
        Cipler(L.map { it.second }, { ad -> L.first { it.second == ad }.first == p.asker }) { ad -> degis(p.copy(asker = L.first { it.second == ad }.first)) }
    }
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Icon(Icons.Rounded.Shield, null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Soluk("Kimlik numarası yok. Bilgilerin sadece bu telefonda.")
    }
}

/** Doğum tarihi: kutuda yalnız rakamlar tutulur (GGAAYYYY), noktalar ekranda gösterilir (imleç kaymaz).
 *  Tam ve geçerli bir tarih yazılınca YYYY-AA-GG saklanır; yarım kalırsa saklı tarih silinir (Devam kapanır). */
@Composable
private fun TarihAlani(deger: String?, degis: (String) -> Unit) {
    val ilk = deger?.split("-")?.takeIf { it.size == 3 }?.let { it[2] + it[1] + it[0] } ?: ""
    var rakam by remember { mutableStateOf(ilk) }
    val gecersiz = rakam.length == 8 && tarihCoz(rakam) == null
    OutlinedTextField(
        value = rakam,
        onValueChange = { yeni ->
            rakam = yeni.filter { it.isDigit() }.take(8)
            degis(tarihCoz(rakam) ?: "")
        },
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text("GG.AA.YYYY") },
        singleLine = true,
        isError = gecersiz,
        supportingText = if (gecersiz) ({ Text("Böyle bir tarih yok, kontrol et.") }) else null,
        visualTransformation = TarihGorunumu,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
    )
}

private fun tarihCoz(r: String): String? {
    if (r.length != 8) return null
    val g = r.substring(0, 2).toInt(); val a = r.substring(2, 4).toInt(); val y = r.substring(4).toInt()
    val ayGun = intArrayOf(31, if (y % 4 == 0 && (y % 100 != 0 || y % 400 == 0)) 29 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
    if (y !in 1940..2012 || a !in 1..12 || g !in 1..ayGun[a - 1]) return null
    return "${r.substring(4)}-${r.substring(2, 4)}-${r.substring(0, 2)}"
}

/** 01111997 → 01.11.1997 (yalnız görünüm; imleç konumları noktalara göre kaydırılır) */
private object TarihGorunumu : androidx.compose.ui.text.input.VisualTransformation {
    override fun filter(text: androidx.compose.ui.text.AnnotatedString): androidx.compose.ui.text.input.TransformedText {
        val r = text.text
        val s = buildString { r.forEachIndexed { i, c -> if (i == 2 || i == 4) append('.'); append(c) } }
        val esle = object : androidx.compose.ui.text.input.OffsetMapping {
            override fun originalToTransformed(offset: Int) = offset + (if (offset > 2) 1 else 0) + (if (offset > 4) 1 else 0)
            override fun transformedToOriginal(offset: Int) = (offset - (if (offset > 2) 1 else 0) - (if (offset > 5) 1 else 0)).coerceIn(0, r.length)
        }
        return androidx.compose.ui.text.input.TransformedText(androidx.compose.ui.text.AnnotatedString(s), esle)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun IlSecici(deger: String?, iller: List<String>, sec: (String) -> Unit) {
    var acik by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(acik, { acik = it }) {
        OutlinedTextField(deger?.ifBlank { null } ?: "Seç", {}, Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable), readOnly = true,
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(acik) })
        ExposedDropdownMenu(acik, { acik = false }) {
            DropdownMenuItem({ Text("Seçme") }, { sec(""); acik = false })
            iller.forEach { il -> DropdownMenuItem({ Text(il) }, { sec(il); acik = false }) }
        }
    }
}

@Composable
private fun AdimBelge(p: Profil, s: Sabitler, degis: (Profil) -> Unit) {
    Soru("Ehliyet ve belgeler")
    val ehliyetSecim = when { p.ehliyet == null && p.ehliyetVar == null -> null; p.ehliyetVar == true || !p.ehliyet.isNullOrBlank() -> "var"; else -> "yok" }
    Secenekler(listOf(Triple("var", "Ehliyetim var", null), Triple("yok", "Yok", null)), ehliyetSecim) { v ->
        degis(if (v == "yok") p.copy(ehliyet = "", ehliyetVar = false) else p.copy(ehliyetVar = true, ehliyet = p.ehliyet ?: ""))
    }
    if (p.ehliyetVar == true) Alan("Sınıfları") {
        val secili = p.ehliyet.orEmpty().split(Regex("[\\s,]+")).filter { it.isNotBlank() }.toSet()
        Cipler(SINIF, { it in secili }) { sn -> val y = if (sn in secili) secili - sn else secili + sn; degis(p.copy(ehliyet = SINIF.filter { it in y }.joinToString(", "))) }
    }
    Alan("Belgelerin") {
        val B = p.belgeler.orEmpty().toSet()
        Cipler(s.belgeler + "Hiçbiri", { if (it == "Hiçbiri") p.belgeSoruldu == true && B.isEmpty() else it in B }) { b ->
            degis(if (b == "Hiçbiri") p.copy(belgeler = emptyList(), belgeSoruldu = true)
            else p.copy(belgeler = (if (b in B) B - b else B + b).toList(), belgeSoruldu = true))
        }
    }
}

@Composable
private fun AdimSon(p: Profil, degis: (Profil) -> Unit) {
    Soru("Son birkaç soru"); Soluk("Hepsi isteğe bağlı.")
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Sayi("Boy (cm)", p.boy, "172", Modifier.weight(1f)) { degis(p.copy(boy = it)) }
        Sayi("Kilo (kg)", p.kilo, "72", Modifier.weight(1f)) { degis(p.copy(kilo = it)) }
    }
    Sayi("Deneyim (yıl)", p.deneyim, "0", Modifier.fillMaxWidth()) { degis(p.copy(deneyim = it)) }
    EvetHayir("Öğrenci misin?", p.ogrenci, "degil", "orgun") { degis(p.copy(ogrenci = it)) }
    EvetHayir("Kadrolu memur musun?", p.kadrolu) { degis(p.copy(kadrolu = it)) }
    EvetHayir("Kamuda 4/B sözleşmeli misin?", p.sozlesmeli) { degis(p.copy(sozlesmeli = it)) }
    EvetHayir("Son 1 yılda 4/B sözleşmen feshedildi mi?", p.fesih) { degis(p.copy(fesih = it)) }
    EvetHayir("Emekli aylığı alıyor musun?", p.emekli) { degis(p.copy(emekli = it)) }
    Alan("Çalışmak istediğin iller", "Boş bırakırsan her yer. Virgülle ayır: Ankara, İzmir") {
        OutlinedTextField(p.iller.orEmpty(), { degis(p.copy(iller = it)) }, Modifier.fillMaxWidth(), placeholder = { Text("Boş = her yer") }, singleLine = true)
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        Checkbox(p.genel != false, { degis(p.copy(genel = it)) })
        Text("T.C. vatandaşıyım, sicilim temiz.", fontSize = 15.sp)
    }
}

@Composable
private fun Sayi(ad: String, deger: String?, ph: String, m: Modifier, degis: (String) -> Unit) =
    OutlinedTextField(deger.orEmpty(), { degis(it.filter { c -> c.isDigit() }.take(3)) }, m, label = { Text(ad) }, placeholder = { Text(ph) }, singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))

@Composable
private fun EvetHayir(soru: String, deger: String?, hayir: String = "hayir", evet: String = "evet", degis: (String) -> Unit) = Alan(soru) {
    Cipler(listOf("Hayır", "Evet"), { (it == "Hayır" && deger == hayir) || (it == "Evet" && deger == evet) }) { degis(if (it == "Evet") evet else hayir) }
}
