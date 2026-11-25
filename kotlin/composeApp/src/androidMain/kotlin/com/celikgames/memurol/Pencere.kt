package com.celikgames.memurol

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews

/** Ana ekran parçacığı: sana uygun ilan sayısı + en yakın son gün. Profil bilgisi buraya gelmez, yalnız sayılar ve ilan adı. */
class Pencere : AppWidgetProvider() {
    override fun onUpdate(c: Context, m: AppWidgetManager, idler: IntArray) = guncelle(c)

    companion object {
        private fun sp(c: Context) = c.getSharedPreferences("pencere", Context.MODE_PRIVATE)

        fun yaz(c: Context, o: PencereOzet) {
            val e = sp(c)
            val yeni = "${o.profilVar}|${o.uygun}|${o.kontrol}|${o.son}|${o.ad}"
            if (e.getString("son_yazilan", null) == yeni) return   // değişmediyse dokunma
            e.edit().putBoolean("var", true).putBoolean("p", o.profilVar).putInt("u", o.uygun).putInt("b", o.kontrol)
                .putString("s", o.son.take(40)).putString("a", o.ad.take(80)).putString("son_yazilan", yeni).apply()
            guncelle(c)
        }

        fun guncelle(c: Context) {
            val m = AppWidgetManager.getInstance(c)
            val idler = m.getAppWidgetIds(ComponentName(c, Pencere::class.java))
            if (idler.isEmpty()) return
            val a = sp(c)
            val v = RemoteViews(c.packageName, R.layout.pencere)
            when {
                !a.getBoolean("var", false) -> { v.setTextViewText(R.id.pencere_sayi, "–"); v.setTextViewText(R.id.pencere_alt, "Uygulamayı bir kez aç"); v.setViewVisibility(R.id.pencere_son, View.GONE) }
                !a.getBoolean("p", true) -> { v.setTextViewText(R.id.pencere_sayi, "–"); v.setTextViewText(R.id.pencere_alt, "Bilgilerini gir, sana uyan ilanları göstereyim"); v.setViewVisibility(R.id.pencere_son, View.GONE) }
                else -> {
                    val u = a.getInt("u", 0); val b = a.getInt("b", 0)
                    v.setTextViewText(R.id.pencere_sayi, u.toString())
                    v.setTextViewText(R.id.pencere_alt, "sana uygun ilan" + if (b > 0) "\n$b ilanda şartlarına bak" else "")
                    val s = a.getString("s", "").orEmpty(); val ad = a.getString("a", "").orEmpty()
                    if (s.isNotEmpty()) { v.setTextViewText(R.id.pencere_son, "Son gün $s" + if (ad.isNotEmpty()) " · $ad" else ""); v.setViewVisibility(R.id.pencere_son, View.VISIBLE) }
                    else v.setViewVisibility(R.id.pencere_son, View.GONE)
                }
            }
            val ac = Intent(c, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("sekme", "uygun")
            v.setOnClickPendingIntent(R.id.pencere_kok, PendingIntent.getActivity(c, 7, ac, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            m.updateAppWidget(idler, v)
        }
    }
}
