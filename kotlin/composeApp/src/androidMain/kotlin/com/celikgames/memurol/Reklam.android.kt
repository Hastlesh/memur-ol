package com.celikgames.memurol

import android.app.Activity
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.viewinterop.AndroidView
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import java.lang.ref.WeakReference

/** AdMob birimleri (Celik Games, uygulama "Memur Ol" ~5408066199). REKLAM_TEST=true iken Google'ın test birimleri. */
object AdMob {
    val SERIT = if (BuildConfig.REKLAM_TEST) "ca-app-pub-3940256099942544/9214589741" else "ca-app-pub-6396011409934303/2893583495"
    val GECIS = if (BuildConfig.REKLAM_TEST) "ca-app-pub-3940256099942544/1033173712" else "ca-app-pub-6396011409934303/5871100628"

    private var etkinlik = WeakReference<Activity>(null)
    private var gecis: InterstitialAd? = null
    private var hazir = false

    fun baslat(a: Activity) {
        etkinlik = WeakReference(a)
        if (hazir) return
        runCatching { MobileAds.initialize(a) { hazir = true; gecisYukle() } }
    }

    fun gecisYukle() {
        val a = etkinlik.get() ?: return
        runCatching {
            InterstitialAd.load(a, GECIS, AdRequest.Builder().build(), object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) { gecis = ad }
                override fun onAdFailedToLoad(e: LoadAdError) { gecis = null }
            })
        }
    }

    fun gecisGoster(): Boolean {
        val a = etkinlik.get() ?: return false
        val ad = gecis ?: run { gecisYukle(); return false }
        gecis = null
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() { gecisYukle() }
            override fun onAdFailedToShowFullScreenContent(e: AdError) { gecisYukle() }
        }
        ad.show(a); return true
    }
}

actual object GecisReklami { actual fun goster(): Boolean = AdMob.gecisGoster() }

@Composable
actual fun ReklamSeridi() {
    val genislik = LocalConfiguration.current.screenWidthDp
    AndroidView(
        modifier = Modifier.fillMaxWidth(),
        factory = { c ->
            AdView(c).apply {
                setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(c, genislik))
                adUnitId = AdMob.SERIT
                runCatching { loadAd(AdRequest.Builder().build()) }
            }
        },
        onRelease = { it.destroy() },
    )
}
