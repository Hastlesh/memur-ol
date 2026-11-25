package com.celikgames.memurol

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.QuestionMark
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Logo: mor kare + sütunlu kamu binası + mercan onay damgası (web sürümündeki SVG'nin aynısı, 64 birimlik ızgara). */
@Composable
fun Logo(boyut: Dp = 40.dp) {
    Canvas(Modifier.size(boyut).semantics { contentDescription = "Memur Ol" }) {
        val b = size.width / 64f
        fun r(x: Float, y: Float, w: Float, h: Float, c: Color, rad: Float = 1.3f) =
            drawRoundRect(c, Offset(x * b, y * b), Size(w * b, h * b), CornerRadius(rad * b))
        drawRoundRect(Brush.linearGradient(listOf(Color(0xFF7048E8), Color(0xFF4A24B8), Color(0xFF241164)), Offset.Zero, Offset(size.width, size.height)), cornerRadius = CornerRadius(19 * b))
        val cati = Path().apply { moveTo(29 * b, 9.5f * b); lineTo(49 * b, 21 * b); lineTo(9 * b, 21 * b); close() }
        drawPath(cati, Color.White); drawPath(cati, Color.White, style = Stroke(2.4f * b, join = StrokeJoin.Round))
        drawCircle(Color(0xFFCDBFF7), 2.1f * b, Offset(29 * b, 16.6f * b))
        r(10.5f, 23f, 37f, 3.6f, Color.White)
        listOf(13.5f, 21.5f, 29.5f, 37.5f).forEach { r(it, 28.6f, 4.6f, 12.4f, Color.White, 1.4f) }
        r(10.5f, 43f, 37f, 3.6f, Color.White); r(7.5f, 48.6f, 43f, 3.6f, Color(0xFFCDBFF7))
        drawCircle(Color.White, 13.2f * b, Offset(47 * b, 46 * b)); drawCircle(Color(0xFFFF6F4F), 11.5f * b, Offset(47 * b, 46 * b))
        val tik = Path().apply { moveTo(41.6f * b, 46.1f * b); lineTo(45.5f * b, 49.9f * b); lineTo(52.5f * b, 42.2f * b) }
        drawPath(tik, Color.White, style = Stroke(3.6f * b, cap = StrokeCap.Round, join = StrokeJoin.Round))
    }
}

@Composable
fun Marka() {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Logo(34.dp)
        Text(buildAnnotatedString {
            append("memur"); withStyle(SpanStyle(color = LocalDurum.current.mercan)) { append("ol") }
        }, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
    }
}

/** grup: uygun | bak | uymuyor  (şart durumları: tamam | bak | yok) */
@Composable
fun DurumHap(grup: String, metin: String? = null) {
    val d = LocalDurum.current
    val (renk, zemin, ikon, yazi) = when (grup) {
        "uygun", "tamam" -> Dortlu(d.tamam, d.tamamZemin, Icons.Rounded.Check, "Uygun")
        "uymuyor", "yok" -> Dortlu(d.yok, d.yokZemin, Icons.Rounded.Close, "Uymuyor")
        else -> Dortlu(d.bak, d.bakZemin, Icons.Rounded.QuestionMark, "Kontrol et")
    }
    Row(Modifier.clip(RoundedCornerShape(50)).background(zemin).padding(horizontal = 9.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Icon(ikon, null, Modifier.size(14.dp), tint = renk)
        Text(metin ?: yazi, color = renk, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}

private data class Dortlu(val a: Color, val b: Color, val c: androidx.compose.ui.graphics.vector.ImageVector, val d: String)

/** Halka grafik: dilimler (adet, renk); ortada içerik. */
@Composable
fun Halka(dilimler: List<Pair<Int, Color>>, boyut: Dp, kalinlik: Dp, arka: Color, orta: @Composable () -> Unit) {
    Box(Modifier.size(boyut), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val k = kalinlik.toPx(); val s = Size(size.width - k, size.height - k); val o = Offset(k / 2, k / 2)
            drawArc(arka, 0f, 360f, false, o, s, style = Stroke(k))
            val top = dilimler.sumOf { it.first }.coerceAtLeast(1)
            var bas = -90f
            dilimler.filter { it.first > 0 }.forEach { (n, c) ->
                val aci = 360f * n / top
                drawArc(c, bas, aci, false, o, s, style = Stroke(k, cap = if (dilimler.count { it.first > 0 } == 1) StrokeCap.Round else StrokeCap.Butt))
                bas += aci
            }
        }
        orta()
    }
}

@Composable
fun Kart(modifier: Modifier = Modifier, tikla: (() -> Unit)? = null, icerik: @Composable ColumnScope.() -> Unit) {
    val m = modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(MaterialTheme.colorScheme.surface)
        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(18.dp))
        .let { if (tikla != null) it.clickable(onClick = tikla) else it }.padding(16.dp)
    Column(m, verticalArrangement = Arrangement.spacedBy(8.dp), content = icerik)
}

@Composable
fun Baslik(metin: String, modifier: Modifier = Modifier) =
    Text(metin, modifier, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

@Composable
fun Soluk(metin: String, modifier: Modifier = Modifier) =
    Text(metin, modifier, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

@Composable
fun Cubuk(oran: Float, renk: Color, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(8.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant)) {
        Box(Modifier.fillMaxWidth(oran.coerceIn(0f, 1f)).fillMaxHeight().clip(CircleShape).background(renk))
    }
}

/** Dalga efekti olmadan tıklanabilir (küçük öğeler için) */
@Composable
fun Modifier.clickableNoRipple(tikla: () -> Unit): Modifier =
    this.clickable(interactionSource = androidx.compose.runtime.remember { androidx.compose.foundation.interaction.MutableInteractionSource() }, indication = null, onClick = tikla)

/**
 * Konfeti: tetik her arttığında ekranın üstünden renkli parçalar dökülür (2 sn). Hareket azaltma tercihine saygı:
 * parçalar kısa sürer, ekrana dokunmayı engellemez.
 */
@Composable
fun Konfeti(tetik: Int) {
    if (tetik == 0) return
    val zaman = androidx.compose.runtime.remember(tetik) { androidx.compose.animation.core.Animatable(0f) }
    androidx.compose.runtime.LaunchedEffect(tetik) { zaman.snapTo(0f); zaman.animateTo(1f, androidx.compose.animation.core.tween(2200, easing = androidx.compose.animation.core.LinearEasing)) }
    if (zaman.value >= 1f) return
    val renkler = listOf(Color(0xFF7048E8), Color(0xFFFF6F4F), Color(0xFF86E8D8), Color(0xFFFFB13D), Color(0xFFB9A6FF))
    val parcalar = androidx.compose.runtime.remember(tetik) {
        val r = kotlin.random.Random(tetik)
        List(70) { floatArrayOf(r.nextFloat(), r.nextFloat() * .35f, .6f + r.nextFloat() * .8f, r.nextFloat() * 360f, (r.nextFloat() - .5f) * .25f, r.nextInt(5).toFloat()) }
    }
    Canvas(Modifier.fillMaxSize()) {
        val t = zaman.value
        parcalar.forEach { p ->
            val x = (p[0] + p[4] * t) * size.width
            val y = (-p[1] + p[2] * t * 1.4f) * size.height
            val a = (1f - t).coerceIn(0f, 1f)
            rotate(p[3] + t * 540f, Offset(x, y)) {
                drawRect(renkler[p[5].toInt()].copy(alpha = a), Offset(x - 6f, y - 3f), Size(12f, 6f))
            }
        }
    }
}

/** Kalan süre yazısı (web: kalan()) */
fun kalanYaz(s: Sure): String = when (s.kod) {
    "gecti" -> "Süresi geçti"; "bugun" -> "Bugün son gün"; "acilmadi" -> s.kisa
    "az", "acik" -> s.kisa + " kaldı"; "belirsiz" -> "Tarih belirsiz"; else -> s.kisa
}

fun kisiYaz(n: Int): String = n.toString().reversed().chunked(3).joinToString(".").reversed()
