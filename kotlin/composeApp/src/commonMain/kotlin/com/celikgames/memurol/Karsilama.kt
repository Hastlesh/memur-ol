package com.celikgames.memurol

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowForward
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.TaskAlt
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun KarsilamaEkrani(d: UygulamaDurum) {
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).safeDrawingPadding().padding(horizontal = 24.dp, vertical = 32.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Marka()
        Spacer(Modifier.height(12.dp))
        Text("Hangi kamu ilanına başvurabilirsin?", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
        Text("Okulunu ve KPSS puanını gir; açık ilanlardaki her kadroyu şart şart senin için kontrol edelim.",
            style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        val n = d.sonuc?.ilanlar?.size
        Madde(Icons.Rounded.TaskAlt, if (n != null) "$n açık ilan, kadro kadro" else "Açık ilanlar, kadro kadro", "Resmî Gazete ve Kariyer Kapısı ilanları her gün taranır.")
        Madde(Icons.Rounded.NotificationsActive, "Son günü kaçırma", "Takip ettiğin ilanların son günleri tek ekranda.")
        Madde(Icons.Rounded.Lock, "Hesap yok, kimlik yok", "Bilgilerin yalnızca bu telefonda kalır.")
        Spacer(Modifier.height(8.dp))
        Button(onClick = { d.sihirbazAc(0) }, Modifier.fillMaxWidth().height(56.dp)) {
            Text("Başla", fontWeight = FontWeight.Bold); Spacer(Modifier.width(8.dp)); Icon(Icons.Rounded.ArrowForward, null)
        }
        Soluk(RESMI_DEGIL)
    }
}

@Composable
private fun Madde(ikon: ImageVector, baslik: String, alt: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.Top) {
        Icon(ikon, null, Modifier.size(26.dp), tint = MaterialTheme.colorScheme.primary)
        Column { Text(baslik, fontWeight = FontWeight.SemiBold); Soluk(alt) }
    }
}
