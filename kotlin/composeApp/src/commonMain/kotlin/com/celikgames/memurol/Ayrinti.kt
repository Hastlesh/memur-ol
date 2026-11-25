package com.celikgames.memurol

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.OpenInNew
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AyrintiEkrani(d: UygulamaDurum, ilanId: String, pozAnahtar: String?) {
    val x = d.ilan(ilanId)
    var ayr by remember(ilanId) { mutableStateOf<Ayrinti?>(null) }
    val secili = x?.pozisyonlar?.firstOrNull { it.anahtar == pozAnahtar }
    LaunchedEffect(ilanId, pozAnahtar, x != null) {
        if (x != null) { d.ilanAcildi(x, secili); ayr = runCatching { d.cekirdek.ayrinti(ilanId, secili?.ad, secili?.i ?: -1, d.profil) }.getOrNull() }
    }
    Scaffold(topBar = {
        TopAppBar(title = { Text(x?.kurumKisa ?: "İlan", maxLines = 1) },
            navigationIcon = { IconButton(onClick = { d.geri() }) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Geri") } })
    }) { ic ->
        if (x == null) {
            Box(Modifier.padding(ic).padding(24.dp)) {
                if (d.sonuc == null) CircularProgressIndicator() else Soluk("Bu ilan artık listede yok (süresi geçmiş olabilir).")
            }
            return@Scaffold
        }
        val P = if (secili != null) listOf(secili) + x.pozisyonlar.filter { it !== secili } else x.pozisyonlar
        LazyColumn(Modifier.padding(ic), contentPadding = PaddingValues(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(x.konu, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
                    Soluk(x.kurum + (x.ozet.kisi?.let { " · toplam ${kisiYaz(it)} kişi" } ?: ""))
                }
            }
            item { ZamanKart(x) }
            if (x.ozet.ilanNe.isNotBlank()) item { Kart(Modifier.padding(horizontal = 16.dp)) { Baslik("Bu ilan ne?"); Text(x.ozet.ilanNe, fontSize = 15.sp) } }
            val a = ayr
            if (a != null && (secili != null && !a.isNe.isNullOrBlank() || !a.statu.isNullOrBlank() || secili?.ildeki != null || a.taban != null)) item {
                Kart(Modifier.padding(horizontal = 16.dp)) {
                    if (secili != null && !a.isNe.isNullOrBlank()) BilgiSatir(Icons.Rounded.Lightbulb, "Ne iş yapar", a.isNe)
                    if (!a.statu.isNullOrBlank()) BilgiSatir(Icons.Rounded.Work, "Statü", a.statu)
                    secili?.ildeki?.let { BilgiSatir(Icons.Rounded.Place, "Senin illerinde", "$it kişi") }
                    a.taban?.let { t -> BilgiSatir(Icons.Rounded.BarChart, "${t.yil} tabanları", "Puanın ${t.il} ilden ${t.yeter} ilde yeterdi") }
                }
            }
            item { Text(if (P.size > 1) "Kadrolar (${P.size})" else "Şartlar", Modifier.padding(start = 20.dp, top = 6.dp), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold) }
            items(P, key = { it.anahtar }) { z -> SartKart(d, z, acik = z === secili || P.size == 1) }
            item { BasvuruKart(x) }
            val belgeler = ayr?.belgeler.orEmpty()
            if (belgeler.isNotEmpty()) item { HazirlikKart(d, x.id, belgeler) }
            item { Soluk(RESMI_DEGIL, Modifier.padding(horizontal = 20.dp)) }
        }
    }
}

@Composable
private fun BilgiSatir(ikon: androidx.compose.ui.graphics.vector.ImageVector, ad: String, yazi: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
        Box(Modifier.size(34.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.primaryContainer), contentAlignment = Alignment.Center) {
            Icon(ikon, null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
        }
        Column(Modifier.weight(1f)) { Text(ad, fontWeight = FontWeight.Bold, fontSize = 14.sp); Text(yazi, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}

@Composable
private fun ZamanKart(x: Ilan) {
    val dr = LocalDurum.current
    Kart(Modifier.padding(horizontal = 16.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            TarihKutusu(x.sure)
            Text(x.sure.baslik, Modifier.weight(1f), fontWeight = FontWeight.Bold, color = if (x.sure.kod in setOf("bugun", "az")) dr.mercan else MaterialTheme.colorScheme.onSurface)
        }
        x.sure.not.forEach { Soluk("• $it") }
    }
}

@Composable
private fun SartKart(d: UygulamaDurum, z: Pozisyon, acik: Boolean) {
    var ac by remember(z.anahtar) { mutableStateOf(acik) }
    val dr = LocalDurum.current
    Kart(Modifier.padding(horizontal = 16.dp)) {
        Row(Modifier.fillMaxWidth().clickable { ac = !ac }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            DurumHap(z.grup)
            Text(z.ad, Modifier.weight(1f), fontWeight = FontWeight.Bold)
            z.adet?.let { Soluk("$it kişi") }
            Icon(if (ac) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore, if (ac) "Kapat" else "Aç")
        }
        if (z.neden.isNotBlank() && z.grup != "uygun") Text(z.neden, fontSize = 14.sp, color = if (z.grup == "uymuyor") dr.yok else dr.bak)
        if (ac) {
            z.sartlar.forEach { s ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
                    val (ik, renk) = when (s.durum) { "tamam" -> Icons.Rounded.CheckCircle to dr.tamam; "yok" -> Icons.Rounded.Cancel to dr.yok; else -> Icons.Rounded.Help to dr.bak }
                    Icon(ik, null, Modifier.size(20.dp).padding(top = 1.dp), tint = renk)
                    Text(s.not, Modifier.weight(1f), fontSize = 14.sp)
                }
            }
            if (z.sartlar.isEmpty()) Soluk("Bu ilanın şartlarını otomatik okuyamadım; ilan metnine bak.")
            val t = d.takip[z.anahtar]
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(t == "takip", { d.takipYaz(z.anahtar, if (t == "takip") null else "takip") }, { Text("Takip et") }, leadingIcon = { Icon(Icons.Rounded.Bookmark, null, Modifier.size(16.dp)) })
                FilterChip(t == "basvurdum", { d.takipYaz(z.anahtar, if (t == "basvurdum") null else "basvurdum") }, { Text("Başvurdum") }, leadingIcon = { Icon(Icons.Rounded.Done, null, Modifier.size(16.dp)) })
            }
        }
    }
}

@Composable
private fun BasvuruKart(x: Ilan) {
    Kart(Modifier.padding(horizontal = 16.dp)) {
        Baslik("Nasıl başvurulur?")
        x.ozet.adimlar.forEachIndexed { i, a ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.size(24.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.primaryContainer), contentAlignment = Alignment.Center) {
                    Text("${i + 1}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                }
                Text(a, Modifier.weight(1f), fontSize = 14.sp)
            }
        }
        x.ozet.link?.takeIf { it.startsWith("https://") || it.startsWith("http://") }?.let { l ->
            Button(onClick = { Istatistik.olay("basvuru_sayfasi", "kurum" to x.kurumKisa); disAc(l) }, Modifier.fillMaxWidth()) { Text("Başvuru sayfasını aç"); Spacer(Modifier.width(6.dp)); Icon(Icons.AutoMirrored.Rounded.OpenInNew, null, Modifier.size(18.dp)) }
        }
        x.kaynak?.takeIf { it.startsWith("https://") }?.let { k ->
            OutlinedButton(onClick = { disAc(k) }, Modifier.fillMaxWidth()) { Icon(Icons.Rounded.Description, null); Spacer(Modifier.width(6.dp)); Text("İlanın aslı (resmî metin)") }
        }
    }
}

@Composable
private fun HazirlikKart(d: UygulamaDurum, ilanId: String, L: List<Belge>) {
    val S = d.hazirlik[ilanId].orEmpty().toSet()
    Kart(Modifier.padding(horizontal = 16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) { Baslik("Hazırlık listesi"); Spacer(Modifier.weight(1f)); Soluk("${L.count { it.id in S }}/${L.size}") }
        Soluk("İlanda istenen belgeler. Hazırladıklarını işaretle.")
        L.forEach { b ->
            Row(Modifier.fillMaxWidth().clickable { d.belgeDegis(ilanId, b.id) }, verticalAlignment = Alignment.CenterVertically) {
                Checkbox(b.id in S, { d.belgeDegis(ilanId, b.id) }); Text(b.ad, fontSize = 14.sp)
            }
        }
    }
}
