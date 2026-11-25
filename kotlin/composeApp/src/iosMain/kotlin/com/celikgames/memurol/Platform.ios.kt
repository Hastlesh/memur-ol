package com.celikgames.memurol

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.coroutines.suspendCancellableCoroutine
import platform.Foundation.NSDate
import platform.Foundation.NSHTTPURLResponse
import platform.Foundation.NSISO8601DateFormatter
import platform.Foundation.NSString
import platform.Foundation.NSURL
import platform.Foundation.NSURLRequest
import platform.Foundation.NSURLRequestReloadIgnoringLocalCacheData
import platform.Foundation.NSURLSession
import platform.Foundation.NSUTF8StringEncoding
import platform.Foundation.NSUserDefaults
import platform.Foundation.create
import platform.Foundation.dataTaskWithRequest
import platform.Foundation.setValue
import platform.JavaScriptCore.JSContext
import platform.UIKit.UIActivityViewController
import platform.UIKit.UIApplication
import kotlin.coroutines.resume

/** iOS: sistemin JavaScriptCore motoru (Safari'nin motoru; sayfa yok, yalnız hesap). */
actual class JsMotor actual constructor() {
    private var ctx: JSContext? = null
    actual suspend fun calistir(kod: String): String {
        val c = ctx ?: JSContext().also { ctx = it }
        c.exceptionHandler = null
        val sonuc = c.evaluateScript(kod)
        c.exception?.let { hata -> c.exception = null; error("JS hatası: ${hata.toString_()}") }
        return sonuc?.toString_() ?: ""
    }
    actual fun kapat() { ctx = null }
}

actual object Depo {
    private val d get() = NSUserDefaults.standardUserDefaults
    actual fun oku(anahtar: String): String? = d.stringForKey("memurol.$anahtar")
    actual fun yaz(anahtar: String, deger: String?) { if (deger == null) d.removeObjectForKey("memurol.$anahtar") else d.setObject(deger, "memurol.$anahtar") }
}

@OptIn(ExperimentalForeignApi::class)
actual suspend fun indir(adres: String): String? {
    if (!adres.startsWith("https://")) return null
    val url = NSURL.URLWithString(adres) ?: return null
    val istek = NSURLRequest.requestWithURL(url, NSURLRequestReloadIgnoringLocalCacheData, 20.0)
    return suspendCancellableCoroutine { k ->
        val is_ = NSURLSession.sharedSession.dataTaskWithRequest(istek) { veri, yanit, hata ->
            val tamam = hata == null && (yanit as? NSHTTPURLResponse)?.statusCode?.toInt() == 200 && veri != null
            k.resume(if (tamam) NSString.create(data = veri!!, encoding = NSUTF8StringEncoding)?.toString() else null)
        }
        is_.resume()
        k.invokeOnCancellation { is_.cancel() }
    }
}

@OptIn(ExperimentalForeignApi::class)
actual suspend fun indirKosullu(adres: String, damga: String?): Indirilen? {
    if (!adres.startsWith("https://")) return null
    val url = NSURL.URLWithString(adres) ?: return null
    val istek = platform.Foundation.NSMutableURLRequest.requestWithURL(url) as platform.Foundation.NSMutableURLRequest
    istek.setCachePolicy(NSURLRequestReloadIgnoringLocalCacheData)
    istek.setTimeoutInterval(20.0)
    if (damga != null) istek.setValue(damga, forHTTPHeaderField = "If-Modified-Since")
    return suspendCancellableCoroutine { k ->
        val is_ = NSURLSession.sharedSession.dataTaskWithRequest(istek) { veri, yanit, hata ->
            val h = yanit as? NSHTTPURLResponse
            k.resume(when {
                hata != null || h == null -> null
                h.statusCode.toInt() == 304 -> Indirilen(null, damga, true)
                h.statusCode.toInt() == 200 && veri != null -> Indirilen(NSString.create(data = veri, encoding = NSUTF8StringEncoding)?.toString(),
                    h.allHeaderFields["Last-Modified"] as? String, false)
                else -> null
            })
        }
        is_.resume(); k.invokeOnCancellation { is_.cancel() }
    }
}

actual fun disAc(adres: String) {
    if (!adres.startsWith("https://") && !adres.startsWith("http://")) return
    val u = NSURL.URLWithString(adres) ?: return
    UIApplication.sharedApplication.openURL(u, emptyMap<Any?, Any?>(), null)
}

actual fun paylas(metin: String) {
    val kok = UIApplication.sharedApplication.keyWindow?.rootViewController ?: return
    kok.presentViewController(UIActivityViewController(listOf(metin), null), true, null)
}

actual fun simdiIso(): String = NSISO8601DateFormatter().stringFromDate(NSDate())
