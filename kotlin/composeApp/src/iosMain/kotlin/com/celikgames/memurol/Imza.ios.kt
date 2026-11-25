package com.celikgames.memurol

import kotlinx.cinterop.BetaInteropApi
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.usePinned
import platform.CoreFoundation.CFDataRef
import platform.CoreFoundation.CFDictionaryRef
import platform.Foundation.CFBridgingRelease
import platform.Foundation.CFBridgingRetain
import platform.Foundation.NSData
import platform.Foundation.NSDictionary
import platform.Foundation.create
import platform.Foundation.dictionaryWithObjects
import platform.Security.SecKeyCreateWithData
import platform.Security.SecKeyVerifySignature
import platform.Security.kSecAttrKeyClass
import platform.Security.kSecAttrKeyClassPublic
import platform.Security.kSecAttrKeyType
import platform.Security.kSecAttrKeyTypeECSECPrimeRandom
import platform.Security.kSecKeyAlgorithmECDSASignatureMessageX962SHA256
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

/** Çekirdek imza açık anahtarı, ham X9.63 biçimi (04 || X || Y, 65 bayt) — Android'deki SPKI ile aynı anahtar. */
private const val ACIK_ANAHTAR_HAM = "BLXkXyzw1kNHeswOy5GT1xwgry+3kJzi4oH2PQnFEKR5EW55cyx0Wo1ew/K63YXZ/8DIiA3qU+ESsV4pkgT59J8="

@OptIn(ExperimentalForeignApi::class, BetaInteropApi::class)
private fun ByteArray.nsData(): NSData = if (isEmpty()) NSData() else usePinned { NSData.create(bytes = it.addressOf(0), length = size.toULong()) }

@OptIn(ExperimentalForeignApi::class, ExperimentalEncodingApi::class)
actual fun imzaDogrula(veri: ByteArray, imzaDer: ByteArray): Boolean = runCatching {
    val ozellik = NSDictionary.dictionaryWithObjects(
        listOf(CFBridgingRelease(kSecAttrKeyTypeECSECPrimeRandom), CFBridgingRelease(kSecAttrKeyClassPublic)),
        listOf(CFBridgingRelease(kSecAttrKeyType), CFBridgingRelease(kSecAttrKeyClass)))
    val anahtarVeri = CFBridgingRetain(Base64.decode(ACIK_ANAHTAR_HAM).nsData()) as CFDataRef?
    val ozellikCf = CFBridgingRetain(ozellik) as CFDictionaryRef?
    val anahtar = SecKeyCreateWithData(anahtarVeri, ozellikCf, null) ?: return false
    val v = CFBridgingRetain(veri.nsData()) as CFDataRef?
    val i = CFBridgingRetain(imzaDer.nsData()) as CFDataRef?
    SecKeyVerifySignature(anahtar, kSecKeyAlgorithmECDSASignatureMessageX962SHA256, v, i, null)
}.getOrDefault(false)
