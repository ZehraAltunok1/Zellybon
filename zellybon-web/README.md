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
| `js/game/rng.js` | Seed'li rastgele üreteç (mulberry32) |
| `js/game/board.js` | Tahta, eşleşme, düşme, doldurma, karıştırma (DOM'suz) |
| `js/game/scoring.js` | Puan, kombo, Isı Barı / Şeker Fırtınası (DOM'suz) |
| `js/game/renderer.js` | Canvas 2D çizim ve animasyonlar |
| `js/game/input.js` | Kaydırma ve dokun-dokun algılama |
| `js/game/game.js` | Hızlı Tur kontrolcüsü (süre, akış) |
| `js/api.js` | Backend istekleri, JWT saklama |
| `js/auth.js` | Giriş/kayıt formu |
| `js/screens/*` | Menü, sonuç, rekor ekranları |
| `js/main.js` | Başlatma ve ekran geçişleri |
