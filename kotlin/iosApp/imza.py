#!/usr/bin/env python3
"""App Store imzası — bulut Mac'te her çalıştırmada geçici dağıtım sertifikası + App Store profilleri.

  python3 imza.py kur  <bundle_id> [<bundle_id> ...]   -> sertifika anahtarlığa, profiller Xcode'a; durum: $RUNNER_TEMP/imza.json
  python3 imza.py temizle                               -> sertifika iptal, profiller silinir (her durumda çalışır)

Neden: hesapta kayıtlı cihaz yok (geliştirme profili oluşmuyor) ve Apple dağıtım sertifikası sayısını sınırlar;
bu yüzden sertifika her çalıştırmada oluşturulup sonunda iptal edilir. Yüklenmiş sürümler etkilenmez.
Gerekli ortam: ANAHTAR (.p8 yolu), KID, ISS, RUNNER_TEMP. Bağımlılık: pyjwt, cryptography.
"""
import base64, json, os, subprocess, sys, time, uuid, urllib.request, urllib.error
import jwt

API = "https://api.appstoreconnect.apple.com/v1"
TMP = os.environ.get("RUNNER_TEMP", "/tmp")
DURUM = os.path.join(TMP, "imza.json")
ZINCIR = os.path.join(TMP, "imza.keychain-db")
ZSIFRE = uuid.uuid4().hex


def jeton():
    with open(os.environ["ANAHTAR"]) as f:
        k = f.read()
    simdi = int(time.time())
    return jwt.encode({"iss": os.environ["ISS"], "iat": simdi, "exp": simdi + 1000, "aud": "appstoreconnect-v1"},
                      k, algorithm="ES256", headers={"kid": os.environ["KID"], "typ": "JWT"})


def istek(yontem, yol, govde=None):
    v = json.dumps(govde).encode() if govde is not None else None
    r = urllib.request.Request(API + yol, data=v, method=yontem,
                               headers={"Authorization": "Bearer " + jeton(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r) as c:
            t = c.read()
            return json.loads(t) if t else {}
    except urllib.error.HTTPError as h:
        print(f"API hatası {yontem} {yol}: {h.code} {h.read().decode()[:800]}")
        raise


def kos(*a, **k):
    return subprocess.run(a, check=True, **k)


def kur(paketler):
    durum = {"sertifika": None, "profiller": []}
    # 1) özel anahtar + CSR
    anahtar, csr = os.path.join(TMP, "dagitim.key"), os.path.join(TMP, "dagitim.csr")
    kos("openssl", "req", "-new", "-newkey", "rsa:2048", "-nodes", "-keyout", anahtar, "-out", csr,
        "-subj", "/CN=CI Dagitim/O=Celik Games/C=TR")
    csr_metin = open(csr).read()
    # 2) sertifika
    s = istek("POST", "/certificates", {"data": {"type": "certificates", "attributes": {
        "certificateType": "DISTRIBUTION", "csrContent": csr_metin}}})["data"]
    durum["sertifika"] = s["id"]
    json.dump(durum, open(DURUM, "w"))
    cer = os.path.join(TMP, "dagitim.cer")
    open(cer, "wb").write(base64.b64decode(s["attributes"]["certificateContent"]))
    print("sertifika:", s["id"], s["attributes"].get("name"))
    # 3) anahtarlık (p12)
    pem, p12 = os.path.join(TMP, "dagitim.pem"), os.path.join(TMP, "dagitim.p12")
    kos("openssl", "x509", "-inform", "DER", "-in", cer, "-out", pem)
    psifre = uuid.uuid4().hex
    # OpenSSL 3 'security import' ile uyumlu eski şifrelemeyi -legacy ile verir; LibreSSL'de bu seçenek yok
    if subprocess.run(["openssl", "pkcs12", "-export", "-legacy", "-inkey", anahtar, "-in", pem, "-out", p12,
                       "-passout", "pass:" + psifre]).returncode != 0:
        kos("openssl", "pkcs12", "-export", "-inkey", anahtar, "-in", pem, "-out", p12, "-passout", "pass:" + psifre)
    kos("security", "create-keychain", "-p", ZSIFRE, ZINCIR)
    kos("security", "set-keychain-settings", "-lut", "21600", ZINCIR)
    kos("security", "unlock-keychain", "-p", ZSIFRE, ZINCIR)
    kos("security", "import", p12, "-k", ZINCIR, "-P", psifre, "-T", "/usr/bin/codesign", "-T", "/usr/bin/security")
    kos("security", "set-key-partition-list", "-S", "apple-tool:,apple:,codesign:", "-s", "-k", ZSIFRE, ZINCIR,
        stdout=subprocess.DEVNULL)
    mevcut = subprocess.run(["security", "list-keychains", "-d", "user"], capture_output=True, text=True).stdout
    kos("security", "list-keychains", "-d", "user", "-s", ZINCIR, *[x.strip().strip('"') for x in mevcut.split()])
    # 4) profiller
    klasorler = [os.path.expanduser("~/Library/MobileDevice/Provisioning Profiles"),
                 os.path.expanduser("~/Library/Developer/Xcode/UserData/Provisioning Profiles")]
    for k in klasorler:
        os.makedirs(k, exist_ok=True)
    adlar = {}
    for p in paketler:
        b = istek("GET", "/bundleIds?filter[identifier]=" + p + "&filter[platform]=IOS")["data"]
        b = [x for x in b if x["attributes"]["identifier"] == p]
        if not b:
            sys.exit("Apple'da kayıtlı paket yok: " + p)
        ad = "CI " + p + " " + time.strftime("%Y%m%d%H%M%S")
        pr = istek("POST", "/profiles", {"data": {"type": "profiles", "attributes": {"name": ad, "profileType": "IOS_APP_STORE"},
            "relationships": {"bundleId": {"data": {"type": "bundleIds", "id": b[0]["id"]}},
                              "certificates": {"data": [{"type": "certificates", "id": s["id"]}]}}}})["data"]
        durum["profiller"].append(pr["id"])
        json.dump(durum, open(DURUM, "w"))
        icerik = base64.b64decode(pr["attributes"]["profileContent"])
        for k in klasorler:
            open(os.path.join(k, pr["attributes"]["uuid"] + ".mobileprovision"), "wb").write(icerik)
        adlar[p] = ad
        print("profil:", p, "->", ad)
    json.dump(adlar, open(os.path.join(TMP, "profiller.json"), "w"))


def temizle():
    if not os.path.exists(DURUM):
        print("temizlenecek yok"); return
    d = json.load(open(DURUM))
    for pid in d.get("profiller", []):
        try: istek("DELETE", "/profiles/" + pid); print("profil silindi", pid)
        except Exception: pass
    if d.get("sertifika"):
        try: istek("DELETE", "/certificates/" + d["sertifika"]); print("sertifika iptal", d["sertifika"])
        except Exception: pass
    subprocess.run(["security", "delete-keychain", ZINCIR])


if __name__ == "__main__":
    if sys.argv[1] == "kur":
        kur(sys.argv[2:])
    else:
        temizle()
