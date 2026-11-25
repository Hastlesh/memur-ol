package com.celikgames.memurol

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun App(d: UygulamaDurum) {
    MemurOlTema(d.tema) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            when (val e = d.ekran) {
                Ekran.Karsilama -> KarsilamaEkrani(d)
                is Ekran.Sihirbaz -> SihirbazEkrani(d, e.adim)
                Ekran.Ana -> AnaEkran(d)
                is Ekran.IlanAyrinti -> AyrintiEkrani(d, e.ilanId, e.pozAnahtar)
            }
            if (!d.istatistikSoruldu) IstatistikIzni(d)
        }
    }
}

/** İlk açılışta bir kez: anonim istatistik izni (KVKK açık rıza). Dışarı dokununca kapanmaz; iki seçenek eşit ağırlıkta. */
@Composable
private fun IstatistikIzni(d: UygulamaDurum) {
    AlertDialog(
        onDismissRequest = {},
        title = { Text("Uygulamayı birlikte geliştirelim", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Memur Ol'u daha iyi yapmak için anonim kullanım istatistiği gönderilsin mi?")
                Soluk("Gidenler: yaş aralığı, okul düzeyi, bölüm, yaşadığın il, cinsiyet, KPSS puan aralığı, kaç ilana uyduğun ve hangi ilanlara baktığın.")
                Soluk("Gitmeyenler: adın, kesin doğum tarihin, tam puanın, kimlik bilgisi. Profil › Anonim istatistik'ten istediğin zaman kapatabilirsin.")
            }
        },
        confirmButton = { Button(onClick = { d.istatistikSec(true) }) { Text("Evet, gönderilsin") } },
        dismissButton = { TextButton(onClick = { d.istatistikSec(false) }) { Text("Hayır") } },
    )
}
