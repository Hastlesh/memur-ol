package com.celikgames.memurol

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope

class MainActivity : ComponentActivity() {
    private lateinit var durum: UygulamaDurum
    private var izinSonuc: ((Boolean) -> Unit)? = null
    private val izinPenceresi = registerForActivityResult(ActivityResultContracts.RequestPermission()) { izin ->
        izinSonuc?.invoke(izin && Telefon.bildirimIzni()); izinSonuc = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        AndroidBaglam.ctx = applicationContext
        Telefon.izinIsteyici = { sonuc ->
            if (Build.VERSION.SDK_INT >= 33) { izinSonuc = sonuc; izinPenceresi.launch(Manifest.permission.POST_NOTIFICATIONS) } else sonuc(Telefon.bildirimIzni())
        }
        Telefon.kanalKur(); Telefon.kisayollariKur()
        if (Istatistik.izin) runCatching { Analitik.etkin(true) }
        AdMob.baslat(this)
        durum = UygulamaDurum(lifecycleScope)
        hedef(intent)
        // Geri tuşu: uygulama içi ekran yığını; en baştaysa uygulamadan çık
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (!durum.geri()) { isEnabled = false; onBackPressedDispatcher.onBackPressed(); isEnabled = true }
            }
        })
        setContent { App(durum) }
    }

    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); hedef(intent) }

    /** Bildirim / kısayol / parçacıktan gelen hedef. Yalnız bilinen sekmeler; ilan kimliği listede yoksa ekran zaten "artık listede yok" der. */
    private fun hedef(i: Intent?) {
        if (i == null) return
        val sekme = i.getStringExtra("sekme")?.takeIf { it in setOf("uygun", "ilanlar", "profil") } ?: return
        val ilan = i.getStringExtra("ilan")?.takeIf { it.length in 1..200 }
        val poz = i.getStringExtra("poz")?.takeIf { it.length in 1..220 }
        durum.hedefAc(ilan, poz, sekme)
        i.removeExtra("sekme")
    }

    override fun onDestroy() { durum.cekirdek.kapat(); super.onDestroy() }
}
