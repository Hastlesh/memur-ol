import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.multiplatform")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("org.jetbrains.compose")
}
// Firebase (anonim istatistik): ayar dosyası yalnız bu bilgisayarda (depoya girmez). Yoksa (ör. iOS bulut derlemesi) eklenti uygulanmaz.
if (file("google-services.json").exists()) apply(plugin = "com.google.gms.google-services")

kotlin {
    androidTarget { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }
    // iPhone: derleme yalnız Mac'te (bulut Mac / GitHub Actions macOS) yapılır
    listOf(iosArm64(), iosSimulatorArm64()).forEach {
        it.binaries.framework { baseName = "ComposeApp"; isStatic = true }
    }
    sourceSets {
        commonMain.dependencies {
            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation(compose.materialIconsExtended)
            implementation(compose.components.resources)
            implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.2")
            implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.2")
        }
        androidMain.dependencies {
            implementation("androidx.activity:activity-compose:1.10.1")
            // Ortak JS çekirdeği Android'de WebView'in yalıtılmış JS motorunda çalışır (sayfa yok, yalnız hesap)
            implementation("androidx.javascriptengine:javascriptengine:1.0.0")
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-guava:1.10.2")
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
            // Arka plan denetimi (3 saatte bir, internet varken) — eski sürümdeki JobScheduler'ın karşılığı
            implementation("androidx.work:work-runtime-ktx:2.10.1")
            // Anonim istatistik — yalnız kullanıcı izin verirse açılır (manifestte varsayılan kapalı)
            implementation(project.dependencies.platform("com.google.firebase:firebase-bom:33.7.0"))
            implementation("com.google.firebase:firebase-analytics")
            // Reklam: AdMob (alt şerit + ara sıra tam ekran; bilgi girişinde ve ilan ayrıntısında şerit yok)
            implementation("com.google.android.gms:play-services-ads:23.6.0")
        }
    }
}

val sifreDosya = rootProject.file("../android/imza_sifre.txt")
val sifre = if (sifreDosya.exists()) sifreDosya.readText().trim() else ""

android {
    namespace = "com.celikgames.memurol"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.celikgames.memurol"   // Play'deki Memur Ol ile aynı: güncelleme olarak gider
        minSdk = 26
        targetSdk = 36
        versionCode = 21
        versionName = "3.0"
        // Reklam: deneme (debug) sürümünde Google'ın test reklamları, Play (release) sürümünde gerçek birimler — aşağıda buildTypes
        buildConfigField("boolean", "REKLAM_TEST", "true")
        // AdMob uygulama kimliği (gerçek "Memur Ol"); REKLAM_TEST=true iken birimler test birimidir
        manifestPlaceholders["admobUygulama"] = "ca-app-pub-6396011409934303~5408066199"
    }
    buildFeatures { buildConfig = true }
    // Play'deki sürümle aynı imza anahtarı (takma ad st)
    signingConfigs {
        create("yayin") {
            storeFile = rootProject.file("../android/imza.jks")
            storePassword = sifre
            keyAlias = "st"
            keyPassword = sifre
        }
    }
    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("yayin"); isMinifyEnabled = false; manifestPlaceholders["uygAd"] = "Memur Ol"
            buildConfigField("boolean", "REKLAM_TEST", "false")   // Play sürümü: gerçek AdMob birimleri
        }
        // Deneme sürümü telefonda ayrı uygulama olarak durur (Play'den kurulu Memur Ol'a dokunmaz)
        getByName("debug") { signingConfig = signingConfigs.getByName("yayin"); applicationIdSuffix = ".deneme"; versionNameSuffix = "-deneme"; manifestPlaceholders["uygAd"] = "Memur Ol K" }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    lint { abortOnError = false; checkReleaseBuilds = false }
}
