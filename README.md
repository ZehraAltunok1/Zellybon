# Zellybon

Tek kişilik, renkli jöle oyunları. Rakibin başka oyuncular değil, kendi rekorun.

## Oyunlar

**Jöle Atış (ana oyun):** Jölelerini resmin çevresindeki kaykay yoluna gönder. Her jöle kendi rengindeki küpleri vurur. Tüm küpleri temizle, gizli resmi ortaya çıkar. Mermisi kalan jöleler bekleme kutularına iner; kutular taşarsa bölüm kaybedilir.
- 20 bölüm; zorluk simülasyonla ayarlandı ve giderek artar (8. ve 10. bölümler "nefes bölümü").
- Her bölümün kendi jelibon şekli var: ayıcık, kalp, kola şişesi, yıldız, halka, çilek.
- **Karakterli jöleler:** Zıplayan (şeritte 2 küp), Roket (2 kat hızlı), Delici (art arda aynı renk küplerin hepsi), Bomba (çevredeki küpler). Bölümler ilerledikçe tanıtılır.
- **Canlar:** en fazla 5, 5 dakikada 1 dolar. Her deneme 1 can harcar, kazanırsan geri gelir.
- **Para (🪙):** her yeni bölüm, bölüm numarası arttıkça daha çok para verir.
- **Sandıklar:** 2, 4, 7, 11, 16. bölümlerde. Seyrekleşir ama değerlenir: Bronz → Gümüş → Altın → Elmas → Efsane.
- **Dükkân:** paralarla can, güçlendirici (📦 Ekstra Kutu, ⭐ Süper Başlangıç) ve joker alınır.

**Jöle Patlat (destek oyunu):** 8x8 eşleştirme (match-3). Can ve joker kazandırır.
- **Hızlı Tur:** 60 saniye, Isı Barı ve Şeker Fırtınası. 1.500+ puan +1 can, 3.000+ puan +2 can.
- **Bölümler:** 20 bölüm, hamle sınırı, hedefler ve 1–3 yıldız. Her galibiyet +1 can getirir, bölümler sırayla açılır.
- **Jokerler:** Çekiç, Renk Bombası, Karıştır ve Kum Saati. Satın alınmaz, ödül olarak kazanılır.

| Klasör | İçerik |
|---|---|
| [`zellybon-web/`](zellybon-web/) | Oyunlar ve arayüz: saf HTML/CSS/JS, Canvas 2D |
| [`zellybon-api/`](zellybon-api/) | Node.js + Express + MongoDB API |
| [`PLAN.md`](PLAN.md) | İlk tasarım planı |

## Hızlı başlangıç

```bash
cd zellybon-api && npm install && npm run dev   # .env gerekli, bkz. zellybon-api/README.md
cd zellybon-web && npm run serve                # http://localhost:5500
```
