package com.celikgames.memurol

import android.util.Base64
import java.security.KeyFactory
import java.security.Signature
import java.security.spec.X509EncodedKeySpec

/** Çekirdek imza açık anahtarı (SPKI, ECDSA P-256). Gizli anahtar: SartimTamam\android\cekirdek_imza.pem (yalnız geliştiricide). */
private const val ACIK_ANAHTAR = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEteRfLPDWQ0d6zA7LkZPXHCCvL7eQnOLigfY9CcUQpHkRbnlzLHRajV7D8rrdhdn/wMiIDepT4RKxXimSBPn0nw=="

actual fun imzaDogrula(veri: ByteArray, imzaDer: ByteArray): Boolean = runCatching {
    val anahtar = KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(Base64.decode(ACIK_ANAHTAR, Base64.DEFAULT)))
    Signature.getInstance("SHA256withECDSA").run { initVerify(anahtar); update(veri); verify(imzaDer) }
}.getOrDefault(false)
