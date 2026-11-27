#!/bin/bash
# İmzalı arşiv + App Store Connect'e yükleme (TestFlight). testflight.yml çağırır (kotlin/ klasöründen).
# Gerekli ortam: PROJE, TAKIM, ANAHTAR (.p8 yolu), KID, ISS
# Arşiv doğrudan dağıtım kimliğiyle imzalanır (geliştirme profili kayıtlı cihaz ister, hesapta cihaz yok).
set -o pipefail
cd iosApp
YETKI=(-allowProvisioningUpdates -authenticationKeyPath "$ANAHTAR" -authenticationKeyID "$KID" -authenticationKeyIssuerID "$ISS")

hata() { echo "=== HATALAR ==="; grep -nE "(: error:|^e: |error: |What went wrong|^FAILURE|Execution failed|No profiles|No signing|requires a provisioning)" -A4 "$1" | head -n 80; exit 1; }

echo "== arşiv =="
xcodebuild archive -project "$PROJE.xcodeproj" -scheme "$PROJE" -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$RUNNER_TEMP/$PROJE.xcarchive" \
  CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM="$TAKIM" CODE_SIGN_IDENTITY="Apple Distribution" "${YETKI[@]}" > arsiv.log 2>&1 || hata arsiv.log
tail -n 3 arsiv.log

cat > "$RUNNER_TEMP/disa.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>$TAKIM</string>
  <key>signingStyle</key><string>automatic</string>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
EOF

echo "== imzala ve yükle =="
xcodebuild -exportArchive -archivePath "$RUNNER_TEMP/$PROJE.xcarchive" -exportOptionsPlist "$RUNNER_TEMP/disa.plist" \
  -exportPath "$RUNNER_TEMP/cikti" "${YETKI[@]}" > yukle.log 2>&1 || hata yukle.log
tail -n 5 yukle.log
echo "Yüklendi. App Store Connect → TestFlight'ta 5-30 dk içinde 'İşleniyor' sonra hazır görünür."
