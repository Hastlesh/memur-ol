package com.celikgames.memurol

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.javascriptengine.IsolateStartupParameters
import androidx.javascriptengine.JavaScriptIsolate
import androidx.javascriptengine.JavaScriptSandbox
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.guava.await
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant

/** Uygulama bağlamı: MainActivity açılırken atanır. */
@SuppressLint("StaticFieldLeak")
object AndroidBaglam { lateinit var ctx: Context }

/** Android: WebView'in yalıtılmış JS motoru (sayfa, ağ, dosya erişimi yok — yalnız hesap). */
actual class JsMotor actual constructor() {
    private var sandbox: JavaScriptSandbox? = null
    private var isolate: JavaScriptIsolate? = null

    private suspend fun hazir(): JavaScriptIsolate {
        isolate?.let { return it }
        check(JavaScriptSandbox.isSupported()) { "Bu telefondaki WebView sürümü eski. Google Play'den 'Android System WebView'i güncelle." }
        val s = JavaScriptSandbox.createConnectedInstanceAsync(AndroidBaglam.ctx).await()
        sandbox = s
        val prm = IsolateStartupParameters()
        if (s.isFeatureSupported(JavaScriptSandbox.JS_FEATURE_ISOLATE_MAX_HEAP_SIZE)) prm.maxHeapSizeBytes = 256L * 1024 * 1024
        val iso = s.createIsolate(prm)
        isolate = iso
        return iso
    }

    actual suspend fun calistir(kod: String): String = hazir().evaluateJavaScriptAsync(kod).await()

    actual fun kapat() { runCatching { isolate?.close() }; runCatching { sandbox?.close() }; isolate = null; sandbox = null }
}

actual object Depo {
    private val sp get() = AndroidBaglam.ctx.getSharedPreferences("memurol", Context.MODE_PRIVATE)
    actual fun oku(anahtar: String): String? = sp.getString(anahtar, null)
    actual fun yaz(anahtar: String, deger: String?) { sp.edit().apply { if (deger == null) remove(anahtar) else putString(anahtar, deger) }.apply() }
}

actual suspend fun indir(adres: String): String? = withContext(Dispatchers.IO) {
    if (!adres.startsWith("https://")) return@withContext null
    runCatching {
        val c = URL(adres).openConnection() as HttpURLConnection
        c.connectTimeout = 10_000; c.readTimeout = 20_000; c.useCaches = false
        c.setRequestProperty("Cache-Control", "no-cache")
        try { if (c.responseCode == 200) c.inputStream.use { it.readBytes().decodeToString() } else null } finally { c.disconnect() }
    }.getOrNull()
}

actual suspend fun indirKosullu(adres: String, damga: String?): Indirilen? = withContext(Dispatchers.IO) {
    if (!adres.startsWith("https://")) return@withContext null
    runCatching {
        val c = URL(adres).openConnection() as HttpURLConnection
        c.connectTimeout = 10_000; c.readTimeout = 20_000; c.useCaches = false
        if (damga != null) c.setRequestProperty("If-Modified-Since", damga)
        try {
            when (c.responseCode) {
                304 -> Indirilen(null, damga, true)
                200 -> Indirilen(c.inputStream.use { it.readBytes().decodeToString() }, c.getHeaderField("Last-Modified"), false)
                else -> null
            }
        } finally { c.disconnect() }
    }.getOrNull()
}

actual fun disAc(adres: String) {
    if (!adres.startsWith("https://") && !adres.startsWith("http://")) return
    runCatching { AndroidBaglam.ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(adres)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
}

actual fun paylas(metin: String) {
    val i = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, metin)
    runCatching { AndroidBaglam.ctx.startActivity(Intent.createChooser(i, "Paylaş").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
}

actual fun simdiIso(): String = Instant.now().toString()
