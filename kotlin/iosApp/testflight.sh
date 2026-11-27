#!/bin/bash
# İmzalı arşiv + App Store Connect'e yükleme (TestFlight). testflight.yml çağırır (kotlin/ klasöründen).
# Gerekli ortam: PROJE, TAKIM, ANAHTAR (.p8 yolu), KID, ISS, PAKETLER ("ana.paket [parçacık.paket]")
# İmza: imza.py her çalıştırmada geçici dağıtım sertifikası + App Store profili oluşturur, sonunda iptal eder
# (hesapta kayıtlı cihaz olmadığı için Xcode'un otomatik imzası kullanılamıyor).
set -o pipefail
cd iosApp
pip3 install --quiet --break-system-packages pyjwt cryptography 2>/dev/null || pip3 install --quiet pyjwt cryptography
trap 'python3 imza.py temizle' EXIT
python3 imza.py kur $PAKETLER || exit 1

read -r ANA PARCA <<< "$PAKETLER"
PROFIL_UYGULAMA=$(python3 -c "import json,os;print(json.load(open(os.environ['RUNNER_TEMP']+'/profiller.json'))['$ANA'])")
PROFIL_PARCACIK=""
[ -n "$PARCA" ] && PROFIL_PARCACIK=$(python3 -c "import json,os;print(json.load(open(os.environ['RUNNER_TEMP']+'/profiller.json'))['$PARCA'])")

hata() { echo "=== HATALAR ==="; grep -nE "(: error:|^e: |error: |What went wrong|^FAILURE|Execution failed|No profiles|No signing|requires a provisioning)" -A4 "$1" | head -n 80; exit 1; }

echo "== arşiv =="
xcodebuild archive -project "$PROJE.xcodeproj" -scheme "$PROJE" -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$RUNNER_TEMP/$PROJE.xcarchive" \
  CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM="$TAKIM" CODE_SIGN_IDENTITY="Apple Distribution" \
  PROFIL_UYGULAMA="$PROFIL_UYGULAMA" PROFIL_PARCACIK="$PROFIL_PARCACIK" > arsiv.log 2>&1 || hata arsiv.log
tail -n 3 arsiv.log

PROFIL_SATIRI="<key>$ANA</key><string>$PROFIL_UYGULAMA</string>"
[ -n "$PARCA" ] && PROFIL_SATIRI="$PROFIL_SATIRI<key>$PARCA</key><string>$PROFIL_PARCACIK</string>"
cat > "$RUNNER_TEMP/disa.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>$TAKIM</string>
  <key>signingStyle</key><string>manual</string>
  <key>signingCertificate</key><string>Apple Distribution</string>
  <key>provisioningProfiles</key><dict>$PROFIL_SATIRI</dict>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
EOF

echo "== imzala ve yükle =="
xcodebuild -exportArchive -archivePath "$RUNNER_TEMP/$PROJE.xcarchive" -exportOptionsPlist "$RUNNER_TEMP/disa.plist" \
  -exportPath "$RUNNER_TEMP/cikti" \
  -authenticationKeyPath "$ANAHTAR" -authenticationKeyID "$KID" -authenticationKeyIssuerID "$ISS" > yukle.log 2>&1 || hata yukle.log
tail -n 5 yukle.log
echo "Yüklendi. App Store Connect → TestFlight'ta 5-30 dk içinde 'İşleniyor' sonra hazır görünür."
