# zellybon-web

Zellybon — tek kişilik, kısa seanslı jöle eşleştirme (match-3) oyunu. Saf HTML/CSS/JS (ES modülleri), framework ve build aracı yok.

## Çalıştırma

ES modülleri `file://` üzerinden açılamaz; basit bir statik sunucu gerekir:

```bash
npm run serve
```

Ardından `http://localhost:5500` adresini aç. API'nin (`zellybon-api`) `http://localhost:3000` üzerinde çalışıyor olması gerekir.

### Telefondan denemek
1. Bilgisayar ve telefon aynı Wi-Fi ağında olsun.
2. Bilgisayarın yerel IP'sini bul (ör. `192.168.1.20`).
3. API'nin `.env` dosyasında `CORS_ORIGIN=http://localhost:5500,http://192.168.1.20:5500` yaz.
4. Telefonda `http://192.168.1.20:5500` adresini aç. Oyun API'yi otomatik olarak aynı makinenin 3000 portunda arar.

Farklı bir API adresi için `index.html` içinde `window.ZELLYBON_API_URL` tanımla.

## Testler

Oyun mantığı (tahta, seed'li üreteç, puanlama) Node ile test edilir:

```bash
npm test
```

## Yapı

| Dosya | Görev |
|---|---|
| `js/palette.js` | Ortak renk paleti (her renk: açık / ana / koyu ton) |
| `js/economy.js` | Güçlendirici, sandık ve dükkân gösterim bilgileri |
| `js/shooter/shapes.js` | Jelibon şekillerinin vektörel çizimi, küpler, karakter rozetleri |
| `js/shooter/levels.js` | Jöle Atış bölümleri (piksel resimler, zorluk, karakterler) |
| `js/shooter/engine.js` | Jöle Atış kuralları: yol, atış, bekleme kutuları (DOM'suz) |
| `js/shooter/renderer.js` | Jöle Atış çizimi ve animasyonları |
| `js/shooter/game.js` | Jöle Atış kontrolcüsü |
| `js/nakis/levels.js` | Nakış tabloları |
| `js/nakis/engine.js` | Nakış kuralları: içten dışa işleme, labirent yolu, yolu kesmeme (DOM'suz) |
| `js/nakis/renderer.js` | Kanaviçe, çarpı işi, ilerleyen ip ve makara çizimi |
| `js/game/rng.js` | Seed'li rastgele üreteç (mulberry32) |
| `js/game/board.js` | Jöle Patlat tahtası: eşleşme, düşme, joker patlatması (DOM'suz) |
| `js/game/scoring.js` | Puan, kombo, Isı Barı / Şeker Fırtınası (DOM'suz) |
| `js/game/levels.js` | Jöle Patlat'ın 20 bölümü, yıldız ve kilit kuralları |
| `js/game/jokers.js` | Joker tanımları ve kazanma yolları |
| `js/game/renderer.js` | Jöle Patlat çizimi ve animasyonları |
| `js/game/input.js` | Kaydırma ve dokun-dokun algılama |
| `js/game/game.js` | Jöle Patlat kontrolcüsü (Hızlı Tur + bölüm modu + jokerler) |
| `js/session.js` | Kullanıcı durumu, can sayacı, ödül listesi |
| `js/api.js` | Backend istekleri, JWT saklama |
| `js/screens/*` | Ana menü, Jöle Patlat merkezi, bölüm haritası, sonuç ve rekor ekranları |
| `js/main.js` | Başlatma ve oyunlar arası akış |

Testler `tests/` klasöründe. Otomatik bir oyuncu Jöle Atış'ın her bölümünün kazanılabilir olduğunu doğrular.
