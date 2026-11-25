package com.celikgames.memurol

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

const val KANAL = "ilanlar"
private const val IS_ADI = "memurol-denetim"

actual object Telefon {
    private val c get() = AndroidBaglam.ctx
    /** MainActivity atar: izin penceresini açar */
    var izinIsteyici: ((Boolean) -> Unit) -> Unit = { it(bildirimIzni()) }

    actual fun bildirimIzni(): Boolean =
        (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) &&
            NotificationManagerCompat.from(c).areNotificationsEnabled()

    actual fun bildirimIzniIste(geriDon: (Boolean) -> Unit) { if (bildirimIzni()) geriDon(true) else izinIsteyici(geriDon) }

    actual fun denetimKur(acik: Boolean) {
        val wm = WorkManager.getInstance(c)
        if (!acik) { wm.cancelUniqueWork(IS_ADI); return }
        val istek = PeriodicWorkRequestBuilder<DenetimIsi>(3, TimeUnit.HOURS)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setInitialDelay(30, TimeUnit.MINUTES).build()
        wm.enqueueUniquePeriodicWork(IS_ADI, ExistingPeriodicWorkPolicy.UPDATE, istek)
    }

    fun kanalKur() {
        if (Build.VERSION.SDK_INT >= 26) c.getSystemService(NotificationManager::class.java)
            .createNotificationChannel(NotificationChannel(KANAL, "İlanlar ve son günler", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Sana uygun yeni ilanlar, son başvuru günü hatırlatmaları"
            })
    }

    actual fun bildir(b: Bildirim, sira: Int) {
        if (!bildirimIzni()) return
        kanalKur()
        val ac = Intent(c, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra("ilan", b.ilanId).putExtra("poz", b.poz).putExtra("sekme", "uygun")
        val pi = PendingIntent.getActivity(c, 100 + sira, ac, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val n = NotificationCompat.Builder(c, KANAL).setSmallIcon(R.drawable.bildirim).setColor(0xFF4A24B8.toInt())
            .setContentTitle(b.baslik).setContentText(b.metin.lineSequence().first())
            .setStyle(NotificationCompat.BigTextStyle().bigText(b.metin)).setContentIntent(pi).setAutoCancel(true).build()
        runCatching { NotificationManagerCompat.from(c).notify(200 + sira, n) }
    }

    actual fun pencereYaz(o: PencereOzet) { Pencere.yaz(c, o) }

    actual fun titret() {
        val v = c.getSystemService(Vibrator::class.java) ?: return
        runCatching { if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(25, 120)) }
    }

    /** Simgeye basılı tutunca çıkan kısayollar (paket adına göre kurulur; deneme sürümünde de çalışır) */
    fun kisayollariKur() {
        if (Build.VERSION.SDK_INT < 25) return
        val sm = c.getSystemService(ShortcutManager::class.java) ?: return
        fun k(id: String, ad: String, sira: Int) = ShortcutInfo.Builder(c, id).setShortLabel(ad).setLongLabel(ad).setRank(sira)
            .setIcon(Icon.createWithResource(c, R.mipmap.ic_launcher))
            .setIntent(Intent(c, MainActivity::class.java).setAction(Intent.ACTION_VIEW).putExtra("sekme", id)).build()
        runCatching { sm.dynamicShortcuts = listOf(k("uygun", "Sana uygun", 0), k("ilanlar", "İlanlar", 1), k("profil", "Profilim", 2)) }
    }
}

/** 3 saatte bir: güncel ilanları indirir, çekirdekle hesaplar, yeni/son gün bildirimlerini gösterir, parçacığı günceller. */
class DenetimIsi(ctx: Context, prm: WorkerParameters) : CoroutineWorker(ctx, prm) {
    override suspend fun doWork(): Result {
        AndroidBaglam.ctx = applicationContext
        val profil = Depo.oku("profil")?.let { runCatching { JSON.decodeFromString(Profil.serializer(), it) }.getOrNull() } ?: return Result.success()
        val c = Cekirdek()
        return try {
            // Koşullu indirme: liste değişmediyse 0 bayt; her durumda önbellekteki (güncel) liste hesaplanır
            IlanKaynagi.getir()
            val liste = Depo.oku("ilanlar") ?: return Result.retry()
            if (!c.ilanlariYukle(liste)) return Result.retry()
            val s = c.hesapla(profil)
            Denetim.calistir(c, profil, s).forEachIndexed { i, b -> Telefon.bildir(b, i) }
            Telefon.pencereYaz(Denetim.pencereOzeti(s, true))
            Result.success()
        } catch (e: Throwable) { Result.retry() } finally { c.kapat() }
    }
}
