# Şartım Tamam - otomatik ilan taraması (elle liste yok).
# Kullanım: python -I otomatik.py [--bas YYYYMMDD] [--son YYYYMMDD] [--deneme]
#  1. Resmî Gazete "Çeşitli İlanlar" günlük sayfaları (durum.json'daki son günden bugüne), her PDF indirilir
#  2. İçerikten personel alım ilanları ayrılır (akademik, ihale, yasaklama vb. elenir); resim PDF'ler Windows OCR ile okunur
#  3. İptal ve düzeltme ilanları, andıkları Resmî Gazete tarihinden doğru ilana bağlanır
#  4. Her ilan yukle.js ile kadrolara bölünür; son gün SBB kamu ilanları dizini ile karşılaştırılır
#  5. yeni.json: hazir (yüklenecek), kaldir (iptal/düzeltme yüzünden silinecek eski kayıt), bak (elle), atla
# --deneme: durum.json'u değiştirmez. Yükleme yapılınca: python -I otomatik.py --yuklendi
import sys, re, html, time, json, os, datetime, subprocess, urllib.request, unicodedata, shutil, glob
import pymupdf
sys.stdout.reconfigure(encoding='utf-8')
T = os.path.dirname(os.path.abspath(__file__)); Y = os.path.dirname(T)
IS = os.path.join(T, 'is')
for k in ('gun', 'pdf', 'ocr'): os.makedirs(os.path.join(IS, k), exist_ok=True)
DURUM = os.path.join(T, 'durum.json'); YENI = os.path.join(T, 'yeni.json')
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'}
RG = 'https://www.resmigazete.gov.tr/ilanlar/eskiilanlar/'
arg = sys.argv[1:]
def al(ad):
    if ad in arg: return arg[arg.index(ad) + 1]
bugun = datetime.date.today()
durum = json.load(open(DURUM, encoding='utf-8')) if os.path.exists(DURUM) else {}
durum.setdefault('sonGun', '20261010'); durum.setdefault('islenen', {}); durum.setdefault('yuklu', {}); durum.setdefault('notlar', [])

# Claude yüklemeyi bitirince: hazır olanlar "yüklü" sayılır, kaldırılanlar düşülür.
if '--yuklendi' in arg:
    y = json.load(open(YENI, encoding='utf-8'))
    for r in y['hazir']: durum['yuklu'][r['id']] = {k: r[k] for k in ('ad', 'gun', 'anahtar', 'kurum', 'son', 'url')}
    for r in y['kaldir']: durum['yuklu'].pop(r['id'], None)
    json.dump(durum, open(DURUM, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('yüklü kayıt', len(durum['yuklu'])); sys.exit()

deneme = '--deneme' in arg
g = lambda s: datetime.date(int(s[:4]), int(s[4:6]), int(s[6:]))
bas = g(al('--bas')) if al('--bas') else g(durum['sonGun']) - datetime.timedelta(3)   # geç eklenen sayfalar için 3 gün geri
son = g(al('--son')) if al('--son') else bugun

def sade(s):
    s = s.replace('İ', 'i').replace('I', 'ı').lower().replace('ı', 'i')
    s = unicodedata.normalize('NFD', s)
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', ''.join(c for c in s if unicodedata.category(c) != 'Mn'))).strip()

def anahtar(t):
    # İlanı veren kurum: ilk satır, "...Başkanlığından:" eki atılır
    ilk = next((l for l in t.splitlines() if l.strip()), '')
    ilk = sade(ilk.split(':')[0])
    return re.sub(r'(ndan|nden|dan|den|ndaki|ndeki)$', '', ilk).strip()

def getir(url, dosya):
    if os.path.exists(dosya): return open(dosya, 'rb').read()
    r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
    open(dosya, 'wb').write(r); time.sleep(1)
    return r

def ocr(f, ad, sayfa):
    # Windows'un yerleşik Türkçe yazı tanıması; sonuç önbelleğe yazılır
    txt = os.path.join(IS, 'ocr', f'{ad}_{sayfa}.txt')
    if os.path.exists(txt): return open(txt, encoding='utf-8').read()
    d = os.path.join(IS, 'ocr', ad); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    for i, p in enumerate(pymupdf.open(f)):
        if i >= sayfa: break
        p.get_pixmap(dpi=200).save(os.path.join(d, f'{i:03}.png'))
    if os.name == 'nt':
        o = subprocess.run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', os.path.join(T, 'ocr.ps1'), d],
                           capture_output=True, text=True, encoding='utf-8').stdout
    else:
        # GitHub Actions (Linux): Tesseract, Türkçe dil paketiyle
        o = '\f'.join(subprocess.run(['tesseract', os.path.join(d, png), '-', '-l', 'tur'], capture_output=True, text=True, encoding='utf-8').stdout
                      for png in sorted(os.listdir(d)))
    shutil.rmtree(d, ignore_errors=True)
    open(txt, 'w', encoding='utf-8').write(o)
    return o

PERS = re.compile(r'(personel|memur|sozlesmeli|zabita|itfaiye|isci|uzman yardimci|mufettis yardimci|denetci yardimci|kontrolor|kaymakam|kadro|alim ilani|alimi ilani|sinav ilani|giris sinavi|uzman erbas|astsubay|bekci|polis|guvenlik gorevlisi|koruma ve guvenlik|uzman personel|destek personeli)')
AKADEMIK = re.compile(r'ogretim (uyesi|elemani|gorevlisi)|arastirma gorevlisi|akademik personel|doktor ogretim')
ALIM = re.compile(r'(personel al|memur al|alim ilani|alimi ilani|istihdam edil|sozlesmeli .{0,40}(pozisyon|personel)|zabita memuru|itfaiye eri|uzman yardimci|mufettis yardimci|denetci yardimci|denetmen yardimci|kontrolor|kaymakam aday|surekli isci|giris sinavi|kpss|uzman erbas|astsubay)')
HAYIR = re.compile(r'(ihale|kiraya|satis ilani|tasinmaz|imar plani|tebligat|kayip|yasaklama|ogretim uyesi|ogretim elemani|arastirma gorevlisi)')

def tur(t):
    b = sade(t[:1500])
    if len(sade(t)) < 100: return 'resim'
    if re.search(r'iptal edil|iptal ilani', b): return 'iptal'
    if not ALIM.search(sade(t[:4000])) or not PERS.search(b): return 'alım ilanı değil'
    if AKADEMIK.search(b): return 'akademik'
    # Başlıkta açıkça alım/sınav ilanı yazıyorsa kurum adındaki "ihale" vb. sözcükler eletmez (Kamu İhale Kurumu)
    baslik = sade(t[:350])
    acik = re.search(r'(giris sinavi ilani|alim ilani|alimi ilani|yardimciligi|personel al|memur al|isci al|temin ilani)', baslik)
    if not acik and HAYIR.search(b) and not re.search(r'(personel|memur|isci) al', b): return 'alım ilanı değil'
    if re.search(r'duzeltme', sade(t[:600])): return 'duzeltme'
    return 'alim'

def anilanTarihler(t):
    # "23.09.2026 tarihli ve 33379 sayılı Resmî Gazete" → 20260923
    return sorted({f'{m[3]}{int(m[2]):02}{int(m[1]):02}' for m in re.findall(r'((\d{1,2})[./](\d{1,2})[./](20\d\d))', t)})

# 1. Resmî Gazete günlük ilan sayfaları
adaylar = []; gun = bas
while gun <= son:
    d = gun.strftime('%Y%m%d')
    try: h = getir(f'{RG}{gun:%Y/%m}/{d}-4.htm', f'{IS}/gun/{d}.htm')
    except Exception as e:
        print('sayfa yok', d, str(e)[:50]); gun += datetime.timedelta(1); continue
    h = h.decode('cp1254', errors='replace')
    h = re.sub(r'(?is)<(script|style|xml).*?</\1>', '', h)
    for m in re.finditer(r'(?is)<a\b[^>]*href=["\']?([^"\'>\s]+\.pdf)["\']?[^>]*>(.*?)</a>', h):
        t = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', m.group(2)))).strip()
        u = m.group(1); ad = u.split('/')[-1]
        u = u if u.startswith('http') else f'{RG}{gun:%Y/%m}/{ad}'
        # Bağlantı yazısı sadece kurum adı; konu PDF içeriğinden ayrılır.
        adaylar.append({'gun': d, 'baslik': t, 'url': u, 'ad': ad[:-4]})
    gun += datetime.timedelta(1)
print('RG ilan pdf', len(adaylar))

# 2. SBB dizini (son günü karşılaştırmak için; detay sayfalarına girilmez)
AY = {a: i + 1 for i, a in enumerate(['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'])}
sbb = []
try:
    h = urllib.request.urlopen(urllib.request.Request('https://kamuilan.sbb.gov.tr/', headers=UA), timeout=60).read().decode('utf-8', 'replace')
    h = html.unescape(re.sub(r'(?is)<(script|style).*?</\1>', '', re.sub(r'<input[^>]+__VIEWSTATE[^>]+>', '', h)))
    for m in re.finditer(r"(?is)<a[^>]+href='ilanDetay\.aspx[^']*'[^>]*>(.*?)</a>", h):
        x = [p.strip() for p in re.sub(r'<[^>]+>', '|', m.group(1)).split('|') if p.strip()]
        if len(x) < 3: continue
        t = re.search(r'(\d{1,2}) (\w+)\s*$', sade(x[-1]))
        if not t or t.group(2) not in AY: continue
        tarih = datetime.date(bugun.year, AY[t.group(2)], int(t.group(1)))
        if tarih < bugun - datetime.timedelta(60): tarih = tarih.replace(year=bugun.year + 1)
        sbb.append({'kurum': sade(x[0]), 'baslik': x[1], 'son': tarih})
    print('SBB açık ilan', len(sbb))
except Exception as e: print('SBB okunamadı:', str(e)[:80])

def sbbBul(t, kesin=False):
    # Aynı kurumun birden çok ilanı varsa başlıktaki kişi sayısı ve sözcüklerle doğru olanı seç.
    # kesin=True (ilanda tarih yok, SBB tarihi kullanılacak): kişi sayısı + en az bir konu sözcüğü tutmalı.
    b = sade(t[:700]); hepsi = sade(re.sub(r'(\d)\.(\d{3})', r'\1\2', t)); bas = sade(t[:3000])
    def puan(x):
        # Kişi sayısı, başlıktaki ilk sözcükle birlikte geçmeli: "50 MÜFETTİŞ" ↔ "50 (elli) Müfettiş"
        m = re.match(r'\s*(\d+)\s+(\S+)', re.sub(r'(\d)\.(\d{3})', r'\1\2', x['baslik'])); s = 0
        if m and re.search(rf'\b{m.group(1)}\b(?: \w+){{0,3}} {re.escape(sade(m.group(2)))}', hepsi): s += 2
        s += sum(1 for w in sade(x['baslik']).split() if len(w) > 4 and w not in ('alacak', 'personel', 'ilani') and w in bas)
        return s
    L = [x for x in sbb if x['kurum'] and x['kurum'] in b]
    if kesin: L = [x for x in L if puan(x) >= 3]
    if len({x['son'] for x in L}) > 1:
        en = max(puan(x) for x in L); L = [x for x in L if puan(x) == en]
    return L

# 3. Sınıflandırma (resimse OCR)
ilanlar, iptaller, duzeltmeler, bak, atla = [], [], [], [], []
for a in adaylar:
    if a['ad'] in durum['islenen']: continue
    f = f"{IS}/pdf/{a['ad']}.pdf"
    try: getir(a['url'], f); t = '\n'.join(p.get_text() for p in pymupdf.open(f))
    except Exception as e: bak.append({**a, 'neden': 'indirilemedi/açılamadı: ' + str(e)[:60]}); continue
    a['ocr'] = False
    k = tur(t)
    if k == 'resim':
        t = ocr(f, a['ad'], 2); a['ocr'] = True; k = tur(t)
        if k == 'resim': bak.append({**a, 'neden': 'resim PDF, yazı tanıma da okuyamadı'}); durum['islenen'][a['ad']] = 'okunamadı'; continue
        if k in ('alim', 'duzeltme', 'iptal'): t = ocr(f, a['ad'], 25)
    a['anahtar'] = anahtar(t); a['metin'] = t
    if k == 'iptal': iptaller.append(a); durum['notlar'].append({'tur': 'iptal', 'ad': a['ad'], 'anahtar': a['anahtar'], 'tarihler': anilanTarihler(t)})
    elif k == 'duzeltme': duzeltmeler.append(a); durum['notlar'].append({'tur': 'duzeltme', 'ad': a['ad'], 'anahtar': a['anahtar'], 'tarihler': anilanTarihler(t)})
    elif k == 'alim': ilanlar.append(a)
    else: atla.append({**a, 'neden': k}); durum['islenen'][a['ad']] = k
    if k in ('iptal', 'duzeltme'): durum['islenen'][a['ad']] = k

def ilgili(n, x):
    # Not (iptal/düzeltme) bu ilanı mı anıyor? Aynı kurum + ilanın RG tarihi geçiyor (ya da tarih hiç yok → belirsiz)
    if n['anahtar'] != x['anahtar']: return None
    if not n['tarihler']: return 'belirsiz'
    return 'evet' if x['gun'] in n['tarihler'] else None

# 4. Yükleyici
hazir, kaldir = [], []
def yukle(a, ekler=()):
    f = f"{IS}/pdf/{a['ad']}.pdf"
    komut = ['node', os.path.join(Y, 'yukle.js'), f, *[f"{IS}/pdf/{e}.pdf" for e in ekler], '--kaynak', a['url']]
    if a.get('ocr'):
        txt = os.path.join(IS, 'ocr', a['ad'] + '_25.txt'); komut += ['--metin', txt]
    eslesen = sbbBul(a['metin']); kesin = sbbBul(a['metin'], True)
    if len({x['son'] for x in kesin}) == 1: komut += ['--son', kesin[0]['son'].strftime('%d.%m.%Y')]
    else:
        # "Resmî Gazete'de ilan tarihinden itibaren 15 (on beş) gün içinde" → temkinli: bir gün erken
        m = re.search(r'ilan(?:i|in)? (?:yayim\w* )?tarih\w* (?:itibaren|baslayarak) (\d{1,2}) (?:[a-z ]{2,15} )?(?:is )?gun', sade(a['metin']))
        if m and 'is gun' not in m.group(0):
            komut += ['--son', (g(a['gun']) + datetime.timedelta(int(m.group(1)) - 1)).strftime('%d.%m.%Y')]
    o = subprocess.run(komut, capture_output=True, text=True, encoding='utf-8').stdout
    try: j = json.loads(o[o.index('{'):])
    except Exception: return {**a, 'neden': 'yükleyici hata: ' + o.strip()[:100]}
    sonT = datetime.datetime.fromisoformat(j['son'].replace('Z', '+00:00')) + datetime.timedelta(hours=3) if j.get('son') else None
    r = {k: a[k] for k in ('ad', 'gun', 'url', 'anahtar')}
    r.update({'id': j['id'], 'kurum': j['ad'], 'son': sonT.date().isoformat() if sonT else None, 'kadro': j['kadro'],
              'eksik': j['eksik'], 'ocr': a.get('ocr', False), 'uyari': j['uyari'][:4], 'dosya': os.path.join(Y, 'kayitlar', j['id'] + '.json')})
    tarihler = sorted({x['son'].isoformat() for x in eslesen})
    r['sbb'] = 'SBB listesinde yok' if not eslesen else ('TUTTU' if r['son'] in tarihler else 'FARKLI: SBB ' + ', '.join(tarihler))
    return r

yukluAd = {x['ad']: i for i, x in durum['yuklu'].items()}
for a in ilanlar:
    if a['ad'] in yukluAd: durum['islenen'][a['ad']] = yukluAd[a['ad']]; continue   # zaten listede
    notlar =[(n, ilgili(n, a)) for n in durum['notlar']]
    if any(n['tur'] == 'iptal' and v == 'evet' for n, v in notlar):
        atla.append({**a, 'neden': 'iptal edilmiş'}); durum['islenen'][a['ad']] = 'iptal edilmiş'; continue
    if any(n['tur'] == 'iptal' and v == 'belirsiz' for n, v in notlar):
        bak.append({**a, 'neden': 'aynı kurumun tarihsiz iptal ilanı var, hangi ilanı iptal ettiği belirsiz'}); durum['islenen'][a['ad']] = 'iptal belirsiz'; continue
    ekler = [n['ad'] for n, v in notlar if n['tur'] == 'duzeltme' and v == 'evet']
    r = yukle(a, ekler)
    if 'neden' in r: bak.append(r); continue
    if ekler: r['duzeltme'] = ekler
    # Son günü bugün olan ilan da alınır (23.59'a kadar başvurulabilir; uygulama "Bugün son gün" der)
    if not r['son'] or r['son'] < bugun.isoformat():
        if os.path.exists(r['dosya']) and r['id'] not in durum['yuklu']: os.remove(r['dosya'])
        if r['son']: r['neden'] = 'süresi geçmiş/bugün bitiyor'; atla.append(r); durum['islenen'][a['ad']] = r['neden']; continue
        if g(a['gun']) >= bugun - datetime.timedelta(5):
            # Yeni ilan, SBB henüz listelememiş olabilir: kaydedilmez, sonraki taramada yeniden denenir
            r['neden'] = 'son gün bulunamadı, sonraki taramada yeniden denenecek'; bak.append(r); continue
        r['neden'] = 'son gün yok ve SBB açık ilanlarında değil (kapanmış)'; atla.append(r); durum['islenen'][a['ad']] = r['neden']; continue
    durum['islenen'][a['ad']] = r['id']
    if r['id'] in durum['yuklu']: continue   # aynısı zaten listede
    (bak if r['sbb'].startswith('FARKLI') else hazir).append(r)

# Daha önce yüklenmiş ilanlara sonradan gelen iptal / düzeltme
yeniNot = {n['ad'] for n in iptaller + duzeltmeler}
for id_, x in list(durum['yuklu'].items()):
    for n in durum['notlar']:
        if n['ad'] not in yeniNot: continue
        v = ilgili(n, x)
        if not v: continue
        if n['tur'] == 'iptal' and v == 'evet': kaldir.append({'id': id_, **x, 'neden': 'iptal edildi (' + n['ad'] + ')'})
        elif n['tur'] == 'iptal': bak.append({**x, 'id': id_, 'neden': 'kurumun tarihsiz iptal ilanı geldi: ' + n['ad']})
        elif v == 'evet':
            a = {'ad': x['ad'], 'gun': x['gun'], 'url': x['url'], 'anahtar': x['anahtar'], 'ocr': os.path.exists(os.path.join(IS, 'ocr', x['ad'] + '_25.txt'))}
            a['metin'] = open(os.path.join(IS, 'ocr', x['ad'] + '_25.txt'), encoding='utf-8').read() if a['ocr'] else '\n'.join(p.get_text() for p in pymupdf.open(f"{IS}/pdf/{x['ad']}.pdf"))
            r = yukle(a, [n['ad']])
            if 'neden' in r: bak.append(r); continue
            r['duzeltme'] = [n['ad']]; hazir.append(r); kaldir.append({'id': id_, **x, 'neden': 'düzeltme ile yeniden yüklendi (' + n['ad'] + ')'})
# Hiçbir ilana bağlanamayan iptal/düzeltme: eski (listede olmayan) bir ilanı anıyor
for n in iptaller + duzeltmeler:
    nt = {'anahtar': n['anahtar'], 'tarihler': anilanTarihler(n['metin'])}
    if not any(ilgili(nt, x) for x in ilanlar + list(durum['yuklu'].values())):
        atla.append({'ad': n['ad'], 'gun': n['gun'], 'url': n['url'], 'kurum': n['anahtar'],
                     'neden': ('iptal' if n in iptaller else 'düzeltme') + ': listede olmayan bir ilanı anıyor'})

# SBB'de açık görünüp bizde olmayan ilanlar (Resmî Gazete dışında, sadece kurum sitesinde/Kariyer Kapısı'nda yayımlananlar).
# Kurum başına SBB'deki ilan sayısı bizdekinden fazlaysa fazlası "eksik olabilir" diye listelenir; akademik ve süresi geçenler hariç.
sbbEksik = []
# Bizdeki gerçek (tam okunmuş) ilanların adı + metninin başı; Kariyer Kapısı "duyuru" kayıtları ayrı tutulur
bizim = [sade(str(x.get('kurum', '')) + ' ' + str(x.get('anahtar', ''))) for x in hazir]
duyurular = {}   # id -> (metin, guid)
for f in glob.glob(os.path.join(Y, 'kayitlar', '*.json')):
    try:
        k = json.loads(json.load(open(f, encoding='utf-8'))['json'])
        if k['id'] not in durum['yuklu']: continue
        if k.get('duyuru'): duyurular[k['id']] = (sade(k.get('ad', '')), k.get('guid'), *(k.get('ad', '').split(':', 1) + [''])[:2])
        else: bizim.append(sade(k.get('ad', '') + ' ' + k.get('metin', '')))
    except Exception: pass
kelime = lambda kurum: [w for w in kurum.split() if len(w) > 2 and w not in ('ili', 'baskanligi', 'baskanlik', 'mudurlugu', 'genel', 've', 'rektorlugu', 'universitesi')]
GENEL = {'alacak', 'personel', 'ilani', 'alimi', 'temin', 'temini', 'edilecektir', 'sozlesmeli', 'yili', 'giris', 'sinavi', 'alim', 'duyurusu', 'basvuru'}
def bizdeVar(kurum, baslik, liste):
    K_ = kelime(sade(kurum))
    konu = [w for w in sade(baslik).split() if len(w) > 4 and w not in GENEL and not w.isdigit() and w not in K_]
    # Kurum sözcüklerinin çoğu ("(AFAD)", "Genel Sekreterliği" gibi ekler olmasa da) ve konu sözcüklerinin çoğu aynı ilanda
    esik = lambda L: max(1, -(-len(L) * 2 // 3))
    return any(K_ and sum(w in b for w in K_) >= esik(K_) and (not konu or sum(w in b for w in konu) >= esik(konu)) for b in liste)
if sbb:
    tekil, gor = [], set()
    iptalli = {x['kurum'] for x in sbb if re.search(r'iptal', sade(x['baslik']))}   # iptal duyurusu olan kurumun ilanı sayılmaz
    for x in sbb:
        k = (x['kurum'], sade(x['baslik']))
        if k in gor or x['son'] < bugun or x['kurum'] in iptalli or re.search(r'ogretim|arastirma gorevlisi|akademik|iptal|duzeltme', sade(x['baslik'])): continue
        gor.add(k); tekil.append(x)
    # Kurum adı sözcük sözcük, konu sözcüklerinin çoğuyla birlikte aranır
    for x in tekil:
        if not bizdeVar(x['kurum'], x['baslik'], bizim + [d[0] for d in duyurular.values()]):
            sbbEksik.append({'kurum': x['kurum'], 'baslik': x['baslik'], 'son': x['son'].isoformat(), 'bizde': 0, 'sbbde': 1})

# KARİYER KAPISI resmî RSS beslemesi: bizde olmayan alım ilanı "duyuru" kaydı olarak eklenir (kurum, başlık, tür, bağlantı).
# Beslemede şart ve son gün yok; uygulama bunları "kontrol et, ilanın aslına bak" diye gösterir.
# Beslemeden düşen ya da Resmî Gazete'den tam okunan ilanın duyuru kaydı kaldırılır. İç servislere (API) gidilmez.
KK_DISI = re.compile(r'gorevde yukselme|unvan degisikligi|yurt disi egitim|belge basvurusu|tercih ilani|ogretim|arastirma gorevlisi|merkezi yerlestirme|yeterlik')
kkEklenen, kkBeslemede = [], set()
try:
    import xml.etree.ElementTree as ET
    rss = urllib.request.urlopen(urllib.request.Request('https://kariyerkapisi.gov.tr/RSS', headers=UA), timeout=60).read()
    for it in ET.fromstring(rss).iter('item'):
        bas, link, tur_ = (it.findtext('title') or '').strip(), (it.findtext('link') or '').strip(), (it.findtext('category') or '').strip()
        guid = link.split('i=')[-1]
        kkBeslemede.add(guid)
        if not guid or KK_DISI.search(sade(tur_ + ' ' + bas)): continue
        kurum, _, konu = bas.partition(' - ')
        if bizdeVar(kurum, konu or bas, bizim) or any(d[1] == guid for d in duyurular.values()): continue
        pub = it.findtext('pubDate') or ''
        metin = (f"{kurum.strip()}:\n{(konu or bas).strip()}\n\nBu ilan Kariyer Kapısı'nda yayımlandı (ilan türü: {tur_}; yayın: {pub[5:16]}).\n"
                 "Son başvuru tarihi, şartlar ve kontenjanlar ilanın Kariyer Kapısı sayfasında yazıyor; başvurmadan önce oradan oku.")
        kid = 'kariyer-kapisi-' + guid
        kayit = {'id': kid, 'eklendi': int(time.time() * 1000), 'ad': f"{kurum.strip()}: {(konu or bas).strip()}", 'kaynak': link, 'metin': metin,
                 'B': None, 'uyari': [], 'eksik': False, 'duyuru': True, 'guid': guid, 'tur': tur_}
        json.dump({'json': json.dumps(kayit, ensure_ascii=False)}, open(os.path.join(Y, 'kayitlar', kid + '.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        r = {'ad': 'kk-' + guid, 'gun': bugun.strftime('%Y%m%d'), 'url': link, 'anahtar': sade(kurum), 'id': kid, 'kurum': kayit['ad'], 'son': None,
             'kadro': 0, 'eksik': False, 'ocr': False, 'uyari': [], 'sbb': 'Kariyer Kapısı', 'dosya': os.path.join(Y, 'kayitlar', kid + '.json')}
        hazir.append(r); kkEklenen.append(r)
    print('Kariyer Kapısı beslemesi', len(kkBeslemede), 'ilan, yeni duyuru', len(kkEklenen))
except Exception as e:
    print('Kariyer Kapısı okunamadı:', str(e)[:80])
if kkBeslemede:
    for id_, (ad_, guid, kurum_, konu_) in duyurular.items():
        if guid not in kkBeslemede: kaldir.append({'id': id_, **durum['yuklu'][id_], 'neden': "Kariyer Kapısı'ndan kalktı (süresi bitti)"})
        elif bizdeVar(kurum_, konu_, bizim): kaldir.append({'id': id_, **durum['yuklu'][id_], 'neden': "ilan artık tam okunmuş olarak listede"})

json.dump({'tarih': bugun.isoformat(), 'hazir': hazir, 'kaldir': kaldir, 'bak': [{k: v for k, v in r.items() if k != 'metin'} for r in bak],
           'atla': [{k: v for k, v in r.items() if k != 'metin'} for r in atla], 'sbbEksik': sbbEksik}, open(YENI, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
if not deneme:
    durum['sonGun'] = max(durum['sonGun'], son.strftime('%Y%m%d'))
    json.dump(durum, open(DURUM, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(f'\nHAZIR {len(hazir)}')
for r in hazir: print(' ', r['son'], '|', r['kurum'][:58], '|', r['kadro'], 'kadro', '| OCR' if r['ocr'] else ('| RESİM TABLO' if r['eksik'] else ''), '|', r['sbb'], '| düzeltmeli' if r.get('duzeltme') else '')
print(f'SBB\'DE OLUP BİZDE OLMAYABİLEN {len(sbbEksik)}' + ('' if sbb else ' (SBB okunamadı, karşılaştırma yapılmadı)'))
for r in sorted(sbbEksik, key=lambda r: r['son']): print(' ', r['son'], '|', r['kurum'][:40], '|', r['baslik'][:70], f"| SBB {r['sbbde']} / bizde {r['bizde']}")
print(f'KALDIR {len(kaldir)}')
for r in kaldir: print(' ', r['id'], '|', r['neden'])
print(f'ELLE BAK {len(bak)}')
for r in bak: print(' ', r['ad'], '|', (r.get('kurum') or r.get('baslik', ''))[:58], '|', r.get('neden') or r.get('sbb'))
from collections import Counter
print(f'ATLANDI {len(atla)}', dict(Counter(r['neden'].split(':')[0] for r in atla)))
