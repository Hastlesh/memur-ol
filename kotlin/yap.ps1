# Memur Ol (Kotlin) — Android derlemesi: APK (telefona) + AAB (Play Console'a)
# Kullanım: powershell -ExecutionPolicy Bypass -File yap.ps1 [-deneme]
#   -deneme: yalnız deneme sürümü (Memur Ol K) derlenir ve USB'deki telefona kurulur
# iOS derlemesi bu bilgisayarda yapılamaz (Mac gerekir) → GitHub Actions macOS / bulut Mac.
param([switch]$deneme)
$ErrorActionPreference = 'Continue'
$K = $PSScriptRoot
$S = "$K\.."
$A = "$S\android\arac"
$env:JAVA_HOME = (Get-ChildItem "$A\jdk" -Directory)[0].FullName
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$F = "$K\composeApp\src\commonMain\composeResources\files"
New-Item -ItemType Directory -Force $F | Out-Null

# 1. Ortak JS çekirdeği (sunucudaki taramayla aynı motor) + uygulamayla gelen ilan listesi (internet yoksa)
node "$S\cekirdek\paketle.js" $F
if ($LASTEXITCODE) { throw "çekirdek paketlenemedi" }
# Çıktı türleri Kotlin modeline uymazsa telefonda "Bir sorun var" ekranı çıkar → derlemeden önce durdur
node "$S\cekirdek\tur_denetim.js"
if ($LASTEXITCODE) { throw "çekirdek çıktısı Kotlin modeline uymuyor (tur_denetim.js)" }
Copy-Item "$S\telefon\ilanlar.json" "$F\ilanlar.json" -Force

# 2. Simge
$M = "$K\composeApp\src\androidMain\res\mipmap-xxxhdpi"
New-Item -ItemType Directory -Force $M | Out-Null
Copy-Item "$S\docs\ikon-192.png" "$M\ic_launcher.png" -Force

# 3. Gradle
Push-Location $K
if ($deneme) {
  & "$A\gradle\gradle-8.13\bin\gradle.bat" --no-daemon -q :composeApp:assembleDebug
  $kod = $LASTEXITCODE; Pop-Location
  if ($kod) { throw "gradle hata: $kod" }
  & "$A\sdk\platform-tools\adb.exe" install -r "$K\composeApp\build\outputs\apk\debug\composeApp-debug.apk"
  return
}
& "$A\gradle\gradle-8.13\bin\gradle.bat" --no-daemon -q :composeApp:assembleRelease :composeApp:bundleRelease
$kod = $LASTEXITCODE
Pop-Location
if ($kod) { throw "gradle hata: $kod" }
Copy-Item "$K\composeApp\build\outputs\apk\release\composeApp-release.apk" "$K\MemurOl.apk" -Force
Copy-Item "$K\composeApp\build\outputs\bundle\release\composeApp-release.aab" "$K\MemurOl.aab" -Force
"APK: $K\MemurOl.apk ($([math]::Round((Get-Item "$K\MemurOl.apk").Length/1MB,1)) MB)"
"AAB: $K\MemurOl.aab"
