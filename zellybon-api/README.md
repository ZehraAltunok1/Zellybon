# zellybon-api

Zellybon oyununun Node.js + Express + MongoDB API'si.

## Kurulum

1. [MongoDB Atlas](https://www.mongodb.com/atlas)'ta ücretsiz bir cluster aç, bir veritabanı kullanıcısı oluştur ve "Network Access" kısmından IP adresine izin ver.
2. Bağımlılıkları kur:
   ```bash
   npm install
   ```
3. Bu klasörde bir `.env` dosyası oluştur (GitHub'a gönderilmez):
   ```
   MONGODB_URI=mongodb+srv://KULLANICI:SIFRE@cluster0.xxxxx.mongodb.net/zellybon?retryWrites=true&w=majority
   JWT_SECRET=uzun-rastgele-bir-metin
   PORT=3000
   CORS_ORIGIN=http://localhost:5500,http://127.0.0.1:5500
   ```
   - `MONGODB_URI` — Atlas > Connect > Drivers adresi; `/zellybon` veritabanı adıdır
   - `JWT_SECRET` — üretmek için: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `CORS_ORIGIN` — oyunun açıldığı adres(ler), virgülle ayrılır. VS Code Live Server `127.0.0.1` kullanır.

## Çalıştırma

```bash
npm run dev    # dosya değişince otomatik yeniden başlar
npm start      # üretim
```

Kontrol: `GET http://localhost:3000/api/health` → `{"ok":true}`

## Uç noktalar (Faz 1)

| Metot | Yol | Açıklama |
|---|---|---|
| GET | `/api/health` | Sağlık kontrolü |
| POST | `/api/auth/register` | `{username, password}` → `{token, user}` |
| POST | `/api/auth/login` | `{username, password}` → `{token, user}` |
| GET | `/api/me` | Giriş yapan kullanıcı (`Authorization: Bearer <token>`) |
| POST | `/api/scores` | `{score, maxCombo, jelliesPopped, durationMs}` → `{saved, isNewBest, bestScore}` |
| GET | `/api/records?mode=quick` | En iyi 10 tur + toplam istatistikler |

Tüm hatalar `{ "error": "..." }` biçiminde, Türkçe döner.
