# Zellybon

Tek kişilik, renkli, kısa seanslı bir jöle eşleştirme (match-3) oyunu. Rakibin başka oyuncular değil, kendi rekorun.

| Klasör | İçerik |
|---|---|
| [`zellybon-web/`](zellybon-web/) | Oyun ve arayüz — saf HTML/CSS/JS, Canvas 2D |
| [`zellybon-api/`](zellybon-api/) | Node.js + Express + MongoDB API |
| [`PLAN.md`](PLAN.md) | Oyun tasarımı ve faz planı |

## Hızlı başlangıç

```bash
cd zellybon-api && npm install && npm run dev   # .env gerekli, bkz. zellybon-api/README.md
cd zellybon-web && npm run serve                # http://localhost:5500
```

Durum: **Faz 1 (prototip)** tamamlandı — giriş/kayıt, 60 sn Hızlı Tur, kombo, Isı Barı, kişisel rekorlar.
