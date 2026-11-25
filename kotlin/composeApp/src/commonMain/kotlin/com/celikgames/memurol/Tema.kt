package com.celikgames.memurol

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/** Durum renkleri: renk körlüğü ölçümüyle seçilen palet (web sürümüyle aynı, APK 1.7). */
@Immutable
data class DurumRenk(
    val tamam: Color, val tamamZemin: Color,
    val bak: Color, val bakZemin: Color,
    val yok: Color, val yokZemin: Color,
    val mercan: Color, val markaUst: Color, val markaAlt: Color,
)

private val ACIK_DURUM = DurumRenk(
    tamam = Color(0xFF0F7470), tamamZemin = Color(0xFFDDF2EF),
    bak = Color(0xFFA84B00), bakZemin = Color(0xFFFFEFDF),
    yok = Color(0xFF7F1630), yokZemin = Color(0xFFFBE6EA),
    mercan = Color(0xFFC2381A), markaUst = Color(0xFF7048E8), markaAlt = Color(0xFF241164),
)
private val KOYU_DURUM = DurumRenk(
    tamam = Color(0xFF86E8D8), tamamZemin = Color(0xFF0F2E2B),
    bak = Color(0xFFFFB13D), bakZemin = Color(0xFF352617),
    yok = Color(0xFFF7647B), yokZemin = Color(0xFF3B1C24),
    mercan = Color(0xFFFF8A6B), markaUst = Color(0xFF7048E8), markaAlt = Color(0xFF241164),
)

val LocalDurum = staticCompositionLocalOf { ACIK_DURUM }

private val ACIK = lightColorScheme(
    primary = Color(0xFF4A24B8), onPrimary = Color.White,
    primaryContainer = Color(0xFFE9E2FF), onPrimaryContainer = Color(0xFF241164),
    secondary = Color(0xFFC2381A), onSecondary = Color.White,
    background = Color(0xFFF6F4FB), onBackground = Color(0xFF1B1830),
    surface = Color.White, onSurface = Color(0xFF1B1830),
    surfaceVariant = Color(0xFFEEEAF7), onSurfaceVariant = Color(0xFF5B5672),
    outline = Color(0xFFD9D3EA),
)
private val KOYU = darkColorScheme(
    primary = Color(0xFFB9A6FF), onPrimary = Color(0xFF241164),
    primaryContainer = Color(0xFF35208A), onPrimaryContainer = Color(0xFFE9E2FF),
    secondary = Color(0xFFFF8A6B), onSecondary = Color(0xFF3A0B00),
    background = Color(0xFF110F1C), onBackground = Color(0xFFECE8F8),
    surface = Color(0xFF1B1830), onSurface = Color(0xFFECE8F8),
    surfaceVariant = Color(0xFF262139), onSurfaceVariant = Color(0xFFB4ADCB),
    outline = Color(0xFF3A3452),
)

/** tema: "oto" | "acik" | "koyu" */
@Composable
fun MemurOlTema(tema: String, icerik: @Composable () -> Unit) {
    val koyu = when (tema) { "acik" -> false; "koyu" -> true; else -> isSystemInDarkTheme() }
    androidx.compose.runtime.CompositionLocalProvider(LocalDurum provides if (koyu) KOYU_DURUM else ACIK_DURUM) {
        MaterialTheme(colorScheme = if (koyu) KOYU else ACIK, content = icerik)
    }
}
