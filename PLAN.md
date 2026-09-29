# Zellybon — Oyun Planı

> Tek kişilik, renkli, kısa seanslı bir jöle eşleştirme (match-3) oyunu.
> Jelly Busters'ın "renkli jöleleri eşleştir, patlat, puan topla" mantığından ilham alır; rekabet başka oyunculara karşı değil, **oyuncunun kendi rekorlarına, yıldızlarına ve serilerine karşı**dır.

---

## 1. Vizyon

**Tek cümle:** Her turda kendi rekorunu kırmaya çalıştığın, kısa ve bağımlılık yapan bir jöle patlatma oyunu.

Oyun tamamen **tek kişiliktir**: düello, eşleştirme, canlı rakip yoktur. "Rekabet" hissi; kişisel rekorlar, bölüm yıldızları, günlük seriler ve başarımlarla verilir. Her tur **kısa (60–90 sn)** ve her denemede biraz daha iyisini yapma isteği uyandırır.

### Hedef kitle
- 13–35 yaş arası, mobilde kısa oyun oynayan kullanıcılar
- Kendi rekorunu kırmayı, yıldız ve rozet toplamayı seven oyuncular

### Tasarım ilkeleri
1. **Kısa tur:** Bir oyun en fazla 90 saniye (bölüm modunda hamle sınırlı).
2. **Kendinle yarış:** Her ekranda "önceki en iyin" görünür; yeni rekor kutlanır.
3. **Anında okunabilirlik:** Renkler, animasyonlar ve puan patlamaları ekranda net görünür.
4. **Basit giriş:** Sadece kullanıcı adı + şifre. Giriş, ilerlemenin (rekorlar, yıldızlar) cihazlar arasında saklanması içindir.

---

## 2. Jelly Busters'tan farkımız

| Konu | Klasik jöle match-3 | Zellybon |
|---|---|---|
| Oyun modu | Sadece bölüm haritası | Zamanlı rekor turu + bölüm modu + günlük tahta |
| Tempo | Sıra tabanlı, sakin | **Isı Barı:** hızlı oynamak ödüllendirilir |
| Güçlendirici | Satın alınan booster'lar | Sadece oyun içinde kazanılan özel jöleler |
| Motivasyon | Bölüm geçmek | Rekor, 3 yıldız, günlük seri, başarım rozetleri |
| Tekrar oynanabilirlik | Bölüm bitince azalır | Günlük Tahta her gün yenilenir |

### Özgün mekanikler

**a) Isı Barı (Heat Meter)**
Art arda hızlı eşleştirmeler (1,5 sn içinde) ısı barını doldurur. Bar dolunca 5 saniyelik **"Şeker Fırtınası"** başlar: tüm puanlar x2. Hızlı ve düşünerek oynamayı ödüllendirir.

**b) Özel jöleler** (sadece eşleşmelerden doğar, satın alınmaz)
- **4'lü eşleşme → Çizgili Jöle:** bir satırı ya da sütunu temizler.
- **L/T şekli → Bomba Jöle:** 3x3 alanı patlatır.
- **5'li eşleşme → Gökkuşağı Jöle:** değiştirildiği renkteki tüm jöleleri temizler.
- İki özel jöle yan yana değiştirilirse birleşik etki (ör. Çizgili + Bomba = 3 satır + 3 sütun).

**c) Engeller (bölüm modunda)**
- **Yapışkan jöle:** gri, hareket ettirilemez; yanındaki bir eşleşmeyle çözülür.
- **Buz kaplı jöle:** üzerinde iki kez eşleşme yapılınca kırılır.
- **Şeker kutusu:** jölelerin düşmesini engeller, yanında patlatma ile kırılır.

**d) Günlük Tahta**
Her gün yeni bir tahta (seed). Oyuncu gün boyunca istediği kadar dener; en iyi skoru kaydedilir. Her gün oynayan oyuncu **günlük seri** (🔥 3 gün, 7 gün...) kazanır.

**e) Yıldız ve başarımlar**
Her bölümde puana göre 1–3 yıldız. "İlk 5'li", "10'lu kombo", "7 günlük seri" gibi başarım rozetleri profil ekranında görünür.

---

## 3. Oyun modları

| Mod | Açıklama | Hangi fazda |
|---|---|---|
| **Hızlı Tur** | 60 sn, rastgele tahta, kişisel rekor | Faz 1 (prototip) |
| **Günlük Tahta** | 90 sn, günün tahtası, günlük seri | Faz 2 |
| **Bölüm Modu** | Harita üzerinde bölümler; hamle sınırı, hedef (ör. "30 mavi jöle patlat") ve engeller; 1–3 yıldız | Faz 3 |
| **Başarımlar ve Profil** | Rozetler, istatistikler, seviye/XP | Faz 4 |

## 4. Çekirdek oyun kuralları (prototip için)

- Tahta: **8x8** ızgara, **6 renk** jöle (kırmızı, turuncu, sarı, yeşil, mavi, mor).
- Hamle: yan yana iki jöleyi kaydırarak (swipe) yer değiştir. Eşleşme oluşmazsa geri döner.
- Eşleşme: yatay/dikey 3+ aynı renk patlar; üstteki jöleler düşer, boşluklar yenileriyle dolar.
- Zincirleme (cascade): düşen jöleler yeni eşleşme oluşturursa kombo sayacı artar.
- Puanlama:
  - 3'lü: 30 puan, 4'lü: 60, 5'li: 100
  - Kombo çarpanı: `puan × (1 + 0.5 × kombo_seviyesi)`
  - Şeker Fırtınası sırasında x2
- Tahtada hamle kalmazsa tahta otomatik karıştırılır (süre durmaz).
- Süre bitince skor ekranı: skor, en uzun kombo, patlatılan jöle sayısı.

### Seed'li tahta üretimi
Aynı seed her cihazda aynı başlangıç tahtasını ve aynı "düşen jöle" sırasını üretmeli. Bunun için basit bir deterministik rastgele sayı üreteci (ör. **mulberry32**) kullanılır; `Math.random()` kullanılmaz.

---

## 5. Arayüz ve görsel yön

### Renk paleti (canlı, şeker/jöle teması)

| Rol | Renk | Hex |
|---|---|---|
| Arka plan gradyanı | Mor → pembe | `#6A11CB` → `#FF5FA2` |
| Ana buton | Şeker turuncusu | `#FF9F1C` |
| İkincil buton | Nane yeşili | `#2EC4B6` |
| Metin (açık zemin) | Koyu mor | `#2B0A3D` |
| Metin (koyu zemin) | Beyaz | `#FFFFFF` |
| Jöle: kırmızı | Çilek | `#FF3B5C` |
| Jöle: turuncu | Portakal | `#FF8C1A` |
| Jöle: sarı | Limon | `#FFD60A` |
| Jöle: yeşil | Elma | `#3DDC84` |
| Jöle: mavi | Yaban mersini | `#2D9CFF` |
| Jöle: mor | Üzüm | `#A259FF` |
| Yapışkan jöle | Gri | `#9AA0A6` |

### Görsel stil
- Jöleler: yuvarlak köşeli, parlak üst vurgulu (highlight), hafif gölgeli; dokununca "jiggle" (esneme) animasyonu.
- Patlamada küçük renkli parçacıklar ve yükselen "+60" puan yazısı.
- Yazı tipi: **Baloo 2** veya **Fredoka** (Google Fonts, yuvarlak ve eğlenceli).
- Büyük, parmağa uygun butonlar (en az 48px yükseklik).
- Dikey (portrait) ekran, mobil öncelikli.

### Ekranlar (prototip)
1. **Giriş / Kayıt:** logo, kullanıcı adı, şifre, "Giriş" ve "Kayıt Ol" butonları.
2. **Ana menü:** "Oyna" büyük butonu, kişisel en iyi skor, "Rekorlarım", "Çıkış".
3. **Oyun ekranı:** üstte süre ve skor, ısı barı, ortada 8x8 tahta.
4. **Sonuç ekranı:** skor, yeni rekor rozeti, "Tekrar Oyna", "Menü".
5. **Rekorlarım:** en iyi 10 tur (skor, en uzun kombo, tarih) ve toplam istatistikler.

---

## 6. Teknoloji seçimi

### Unity mi, HTML/CSS/JS mi?

| Kriter | Unity | HTML5 + Canvas + JS |
|---|---|---|
| Prototip hızı | Orta (editör, C#, build süreleri) | **Yüksek** (tarayıcıda anında test) |
| Öğrenme eğrisi | Daha dik | Senin tercihin olan teknolojiler |
| 2D match-3 performansı | Çok iyi | Yeterli (8x8 tahta için fazlasıyla) |
| Mobil mağaza yayını | Doğrudan | Capacitor ile Android/iOS paketlenir |
| Framework'süz çalışma | Mümkün değil (Unity kendisi motor) | **Mümkün** |
| Test/paylaşım | APK gerekir | Link ile telefonda açılır |

**Öneri:** Prototipi **HTML5 Canvas + saf JavaScript** ile yap. 8x8 bir 2D bulmaca için Unity'nin gücüne ihtiyaç yok; tarayıcıda anında test etmek ve linkle arkadaşlara denetmek prototip aşamasında çok daha hızlı. Oyun büyür, 3D efekt ya da ağır animasyon gerekirse Unity'ye geçiş Faz 5'te yeniden değerlendirilir. Oyun mantığı (tahta, eşleşme, puanlama) çizimden ayrı yazılırsa bu geçiş de kolaylaşır.

### Seçilen yığın

| Katman | Teknoloji | Neden |
|---|---|---|
| Frontend (oyun) | HTML5, CSS3, saf JavaScript (ES modülleri), Canvas 2D | Framework yok, hızlı, hafif |
| Mobil paket | **Capacitor** (Faz 5) | Aynı web kodunu Android/iOS uygulamasına çevirir |
| Backend | **Node.js + Express** | JS ile aynı dil, basit REST API |
| Veritabanı | **MongoDB Atlas** (ücretsiz katman) + Mongoose | Senin tercihin, esnek şema |
| Kimlik doğrulama | bcrypt (şifre hash) + JWT | Basit ve yeterli |
| Barındırma | Frontend: Netlify / GitHub Pages; Backend: Render / Railway | Ücretsiz başlangıç |

### Repolar (ayrı ayrı)
- **`zellybon-web`** — oyun ve arayüz (saf HTML/CSS/JS)
- **`zellybon-api`** — Node.js + Express + MongoDB API

### Klasör yapısı

```
zellybon-web/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js          # ekran geçişleri, başlatma
│   ├── api.js           # backend istekleri (fetch)
│   ├── auth.js          # giriş/kayıt formları, token saklama
│   ├── game/
│   │   ├── board.js     # tahta, eşleşme, düşme, doldurma (saf mantık, çizim yok)
│   │   ├── rng.js       # seed'li rastgele üreteç (mulberry32)
│   │   ├── scoring.js   # puan, kombo, ısı barı
│   │   ├── renderer.js  # Canvas çizimi ve animasyon
│   │   └── input.js     # dokunma/kaydırma algılama
│   └── screens/
│       ├── menu.js
│       ├── result.js
│       └── records.js
└── assets/
    └── sounds/

zellybon-api/
├── package.json
├── .env.example         # MONGODB_URI, JWT_SECRET, PORT
├── src/
│   ├── index.js
│   ├── db.js
│   ├── models/
│   │   ├── User.js
│   │   └── Score.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── scores.js
│   └── middleware/
│       └── requireAuth.js
└── README.md
```

---

## 7. Veri modeli (MongoDB)

### `users`
```js
{
  _id: ObjectId,
  username: String,     // benzersiz, 3–16 karakter, a-z 0-9 _
  passwordHash: String, // bcrypt
  bestScore: Number,    // hızlı tur rekoru
  dailyStreak: Number,  // Faz 2: art arda oynanan gün sayısı
  lastDailyDate: String,// Faz 2: "2026-09-29"
  levelStars: Object,   // Faz 3: { "1": 3, "2": 2, ... }
  achievements: [String], // Faz 4: ["first_five", "combo_10", ...]
  xp: Number,           // Faz 4
  createdAt: Date
}
```

### `scores`
```js
{
  _id: ObjectId,
  userId: ObjectId,
  mode: String,         // "quick" | "daily" | "level"
  seed: String,         // daily için
  levelId: Number,      // level için
  score: Number,
  maxCombo: Number,
  jelliesPopped: Number,
  durationMs: Number,
  createdAt: Date
}
// İndeksler: { userId: 1, mode: 1, score: -1 }, { userId: 1, createdAt: -1 }
```

### `dailyBoards` (Faz 2)
```js
{ date: "2026-09-29", seed: "a8f3k2", createdAt: Date }
```

### Bölümler (Faz 3)
Bölüm tanımları veritabanında değil, frontend'de `levels.json` dosyasında tutulur (hamle sayısı, hedef, engel yerleşimi, yıldız eşikleri). Sunucu yalnızca kazanılan yıldızları saklar.

---

## 8. API uç noktaları

| Metot | Yol | Açıklama | Faz |
|---|---|---|---|
| POST | `/api/auth/register` | `{username, password}` → `{token, user}` | 1 |
| POST | `/api/auth/login` | `{username, password}` → `{token, user}` | 1 |
| GET | `/api/me` | Giriş yapan kullanıcının bilgisi | 1 |
| POST | `/api/scores` | Skor kaydet | 1 |
| GET | `/api/records?mode=quick` | Kullanıcının en iyi 10 skoru ve istatistikleri | 1 |
| GET | `/api/daily` | Günün seed'i, kullanıcının bugünkü en iyisi, seri bilgisi | 2 |
| POST | `/api/levels/:id/result` | Bölüm sonucu, yıldız kaydı | 3 |
| GET | `/api/progress` | Tüm yıldızlar, seri, başarımlar | 3 |
| GET | `/api/achievements` | Kazanılan ve kilitli rozetler | 4 |

### Skor doğrulama
Oyun tek kişilik olduğu ve oyuncular birbirine karşı yarışmadığı için ağır hile önlemine gerek yok. Sunucu sadece mantıksız değerleri (ör. 60 sn'de 50.000+ puan) reddeder.

---

## 9. Fazlar

### Faz 0 — Kurulum (yarım gün)
- İki repo oluştur, MongoDB Atlas hesabı ve ücretsiz cluster aç.
- `.env` değerlerini hazırla.

### Faz 1 — Prototip (ilk hedef)
- Kayıt/giriş, 60 sn Hızlı Tur, 8x8 tahta, 6 renk, eşleştir-patlat-düş, kombo, ısı barı, skor kaydı, "Rekorlarım" ekranı.
- Özel jöleler **yok** (Faz 2'de).
- **Bitti sayılma ölçütü:** Telefonun tarayıcısından giriş yapılıp oyun oynanabiliyor, rekor kaydediliyor ve "Rekorlarım"da görünüyor.

### Faz 2 — Oyun derinliği + Günlük Tahta
- Özel jöleler (çizgili, bomba, gökkuşağı) ve birleşik etkiler.
- Günlük Tahta modu ve günlük seri.
- Ses efektleri ve parçacık animasyonları.

### Faz 3 — Bölüm Modu
- Kaydırılabilir bölüm haritası, ilk 20 bölüm.
- Hamle sınırı, bölüm hedefleri, engeller (yapışkan, buz, şeker kutusu), 1–3 yıldız.

### Faz 4 — Başarımlar ve Profil
- Başarım rozetleri, XP ve oyuncu seviyesi, profil ekranında istatistikler.

### Faz 5 — Mobil uygulama ve yayın
- Capacitor ile Android/iOS paketleme, ikon ve açılış ekranı.
- Çevrimdışı oynama: skorlar cihazda bekletilir, bağlantı gelince gönderilir.
- Performans kontrolü; gerekirse Unity'ye geçiş değerlendirmesi.
- Google Play kapalı test.

---

## 10. Faz bazlı hazır promptlar

Aşağıdaki promptları sırayla Claude'a (veya başka bir kod asistanına) verebilirsin. Her prompt tek başına anlaşılır yazıldı.

### Prompt — Faz 0: Backend iskeleti

```
"zellybon-api" adında bir Node.js + Express projesi oluştur. Gereksinimler:
- MongoDB bağlantısı için Mongoose kullan; bağlantı adresi .env içindeki MONGODB_URI'den gelsin.
- .env.example dosyası: MONGODB_URI, JWT_SECRET, PORT, CORS_ORIGIN.
- src/index.js: Express uygulaması, JSON body parser, CORS (sadece CORS_ORIGIN), GET /api/health → {ok:true}.
- src/db.js: bağlantı fonksiyonu.
- package.json script'leri: "dev" (node --watch), "start".
- Kısa bir README: nasıl kurulur, nasıl çalıştırılır.
Framework dışında ek kütüphane kullanma (express, mongoose, cors, dotenv yeterli).
```

### Prompt — Faz 1a: Kullanıcı girişi (API)

```
zellybon-api projesine basit kullanıcı girişi ekle:
- models/User.js: username (benzersiz, 3-16 karakter, sadece a-z 0-9 _ , küçük harfe çevrilir), passwordHash, bestScore (varsayılan 0), createdAt.
- routes/auth.js:
  - POST /api/auth/register {username, password}: şifre en az 6 karakter; bcrypt ile hashle; JWT (7 gün) döndür.
  - POST /api/auth/login {username, password}: doğrula, JWT döndür.
- middleware/requireAuth.js: Authorization: Bearer <token> başlığını doğrular, req.userId ekler.
- GET /api/me: kullanıcı adı ve bestScore döndürür.
- Hata mesajları Türkçe ve JSON: {error: "..."}.
- Şifre hash'i hiçbir yanıtta dönmesin.
Kütüphaneler: bcryptjs, jsonwebtoken.
```

### Prompt — Faz 1b: Skor ve kişisel rekorlar (API)

```
zellybon-api projesine skor sistemi ekle (oyun tek kişilik, oyuncular arası sıralama yok):
- models/Score.js: userId, mode ("quick"), score, maxCombo, jelliesPopped, durationMs, createdAt. İndeks: {mode:1, score:-1}.
- POST /api/scores (giriş gerekli): skoru kaydet. Basit doğrulama: durationMs 55000-65000 arası olmalı, score 0 ile 50000 arası olmalı; değilse 400 döndür. Kullanıcının bestScore'unu gerekirse güncelle. Yanıt: {saved:true, isNewBest:boolean}.
- GET /api/records?mode=quick (giriş gerekli): giriş yapan kullanıcının en iyi 10 skoru (score, maxCombo, createdAt) ve toplam istatistikleri (oynanan tur, toplam patlatılan jöle, en uzun kombo).
```

### Prompt — Faz 1c: Oyun mantığı (frontend, çizimsiz)

```
"zellybon-web" adında framework'süz bir proje başlat (saf HTML/CSS/JS, ES modülleri, build aracı yok).
Önce sadece oyun mantığını yaz, çizim yok:
- js/game/rng.js: mulberry32 tabanlı seed'li rastgele üreteç. createRng(seedString) → { next(): 0..1, int(n) }.
- js/game/board.js: 8x8 tahta, 6 renk (0-5).
  - createBoard(rng): başlangıçta hiç hazır eşleşme olmayan tahta üret.
  - trySwap(board, a, b): komşu değilse veya eşleşme oluşmuyorsa false; oluşuyorsa uygular.
  - findMatches(board): yatay/dikey 3+ grupları döndür.
  - resolve(board, rng): eşleşmeleri temizle, düşür, rng ile doldur, zincirlemeleri tekrarla; her adımı {cleared, falls, spawns, comboLevel} olarak listele (animasyon için).
  - hasPossibleMove(board) ve shuffle(board, rng).
- js/game/scoring.js: 3'lü 30, 4'lü 60, 5'li 100 puan; kombo çarpanı 1 + 0.5 × kombo; ısı barı: 1,5 sn içindeki art arda eşleşmeler barı doldurur, dolunca 5 sn x2 "Şeker Fırtınası".
Bu dosyalar DOM'a dokunmasın; hem tarayıcıda hem Node'da çalışsın.
Node ile çalıştırılabilen basit bir test dosyası (tests/board.test.js, node:test) ekle: aynı seed aynı tahtayı üretir, başlangıçta eşleşme yok, geçersiz swap reddedilir.
```

### Prompt — Faz 1d: Oyun ekranı (Canvas + animasyon)

```
zellybon-web'e oyun ekranını ekle (board.js ve scoring.js hazır):
- js/game/renderer.js: Canvas 2D ile 8x8 tahtayı ekran genişliğine sığacak şekilde çiz. Jöleler yuvarlak köşeli, üstte parlak vurgu, hafif gölge. Renkler: #FF3B5C, #FF8C1A, #FFD60A, #3DDC84, #2D9CFF, #A259FF.
- Animasyonlar (requestAnimationFrame): seçilen jöle hafif büyür; swap kayması; patlamada küçülme + renkli parçacıklar + yukarı süzülen "+puan" yazısı; düşme animasyonu (hafif zıplamalı); jöle dokununca "jiggle".
- js/game/input.js: dokunma ve fare ile kaydırma (swipe) algılama; hangi hücreden hangi yöne.
- Üst bar: kalan süre (60 sn), skor, ısı barı (dolunca parlayan gökkuşağı efekti).
- Süre bitince onGameEnd({score, maxCombo, jelliesPopped, durationMs}) çağrılsın.
- Mobil dikey ekran öncelikli, devicePixelRatio ile net çizim.
```

### Prompt — Faz 1e: Giriş, menü, sonuç ve rekor ekranları

```
zellybon-web'e ekranları ekle (tek index.html, ekranlar div'ler arasında geçişle):
- Giriş/Kayıt: logo "Zellybon" (Baloo 2 veya Fredoka fontu), kullanıcı adı, şifre, "Giriş" ve "Kayıt Ol". Hatalar formun altında Türkçe.
- Ana menü: büyük turuncu "OYNA" butonu (#FF9F1C), kişisel en iyi skor, "Rekorlarım", "Çıkış".
- Sonuç: skor büyük yazıyla, altında "En iyin: X"; yeni rekorsa konfeti ve "YENİ REKOR!" rozeti, "Tekrar Oyna" ve "Menü".
- Rekorlarım: en iyi 10 tur listesi ve toplam istatistikler.
- Arka plan: #6A11CB → #FF5FA2 gradyan; butonlar en az 48px, basınca hafif küçülen animasyon.
- js/api.js: API_URL sabiti, fetch sarmalayıcı, JWT'yi localStorage'da sakla, 401'de giriş ekranına dön.
- Oyun bitince skoru POST /api/scores'a gönder.
Framework ve build aracı kullanma.
```

### Prompt — Faz 2: Özel jöleler + Günlük Tahta

```
Zellybon'a (tek kişilik oyun) şunları ekle:
1) Özel jöleler (board.js): 4'lü → çizgili (eşleşme yönüne göre satır/sütun temizler), L veya T → bomba (3x3), 5'li → gökkuşağı (değiştirildiği rengin tümünü temizler). İki özel jöle değiştirilince birleşik etkiler. Renderer'da her birine ayırt edici görünüm ver.
2) Günlük Tahta: API'de dailyBoards koleksiyonu, GET /api/daily (yoksa o gün için seed üretir; kullanıcının bugünkü en iyisini ve dailyStreak'ini döndürür). 90 sn mod. Günün ilk oyununda seri güncellenir (dün oynadıysa +1, oynamadıysa 1). Menüde "Günlük Tahta" butonu ve 🔥 seri sayacı.
3) Ses efektleri (Web Audio API, küçük dosyalar), sesi aç/kapat butonu.
```

### Prompt — Faz 3: Bölüm Modu

```
Zellybon'a tek kişilik bölüm modu ekle:
- js/game/levels.json: 20 bölüm. Her bölüm: id, moves (hamle sınırı), goal (ör. {type:"color", color:4, count:30} veya {type:"score", value:5000} veya {type:"clear", obstacle:"ice"}), obstacles (hücre konumları ve türleri), stars [1, 2, 3 yıldız puan eşikleri].
- board.js'e engeller: yapışkan jöle (hareket etmez, yanındaki eşleşmeyle çözülür), buz (2 eşleşmede kırılır), şeker kutusu (düşmeyi engeller, yanındaki patlamayla kırılır).
- Oyun ekranında süre yerine kalan hamle ve hedef ilerlemesi.
- Bölüm haritası: dikey kaydırılan, renkli yol üzerinde bölüm düğmeleri, kazanılan yıldızlar görünür; bir bölüm, öncekinden en az 1 yıldız alınınca açılır.
- API: POST /api/levels/:id/result {score, stars} (en iyi yıldız saklanır), GET /api/progress.
```

### Prompt — Faz 4: Başarımlar ve Profil

```
Zellybon'a başarım ve profil sistemi ekle:
- Başarım listesi (js/achievements.js): ör. first_five (ilk 5'li), combo_10, storm_5 (bir turda 5 Şeker Fırtınası), streak_7 (7 günlük seri), stars_30 (30 yıldız), pop_10000 (toplam 10.000 jöle).
- Sunucu, skor/bölüm sonucu kaydedilirken başarımları kontrol edip users.achievements'a ekler ve yeni kazanılanları yanıtta döndürür.
- Kazanılınca ekranın üstünden kayan rozet bildirimi.
- XP: her tur skor/100 XP; seviye eşikleri artan (100, 250, 450...).
- Profil ekranı: seviye çubuğu, rozet ızgarası (kilitliler gri), istatistikler.
```

### Prompt — Faz 5: Mobil uygulama

```
zellybon-web projesini Capacitor ile Android ve iOS uygulamasına çevir:
- Capacitor kurulumu, uygulama kimliği com.zellybon.app, dikey ekran kilidi.
- Uygulama ikonu ve açılış ekranı (mor-pembe gradyan, "Zellybon" logosu).
- Titreşim (Haptics) ile patlama geri bildirimi.
- Çevrimdışı oynama: bağlantı yokken skorları localStorage'da kuyruğa al, bağlantı gelince gönder.
- API_URL'in üretim adresine ayarlanması, CORS güncellemesi.
- Android debug APK üretme adımlarını README'ye yaz.
- Düşük donanımlı cihazda FPS ölçümü yap; 50 FPS altındaysa parçacık sayısını azaltan bir "düşük efekt" ayarı ekle.
```

---

## 11. Prototip başarı ölçütleri

- Kayıt olup giriş yapılabiliyor, sayfa yenilenince oturum korunuyor.
- Telefon tarayıcısında 60 sn'lik tur akıcı (≥ 50 FPS) oynanıyor.
- Aynı seed her cihazda aynı tahtayı üretiyor (test ile kanıtlı).
- Skor kaydediliyor, yeni rekor kutlanıyor ve "Rekorlarım"da görünüyor.
- 3–5 arkadaşa link gönderilip "bir tur daha oynarım" tepkisi alınıyor.

## 12. Riskler ve notlar

- **Telif:** "Jelly Busters" adı, görselleri ve sesleri kullanılmaz; yalnızca tür (match-3) mantığından ilham alınır. Tüm görseller Zellybon'a özgü üretilir.
- **Kapsam kayması:** Faz 1'e özel jöle, ses, bölüm modu eklememek prototipi hızlı bitirmenin anahtarı.
- **Çok oyunculu yok:** Düello, lig, canlı eşleştirme ve oyuncular arası skor tablosu bilinçli olarak kapsam dışıdır.
