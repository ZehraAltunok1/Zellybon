# Zellybon bölüm planlama ajanı

Claude, üç oyun için yeni bölümler tasarlar ve her bölümü **oyunun kendi motoru ve otomatik oyuncularıyla** test eder. Zorluk hedefini tutturana kadar tasarımı düzeltir, sonra bölümü oyuna ekler. Her yeni bölümün hedefi bir öncekinden biraz daha zordur ve daha fazla engel ister.

| Oyun | `--game` | Zorluk ölçüsü | Engeller |
|---|---|---|---|
| Jöle Atış | `shooter` | Rastgele oynayan birinin kazanma oranı | zırhlı küp (`a`), kilitli küp (`l`) |
| Nakış | `nakis` | Rastgele oynayan birinin kazanma oranı | çift ilmek (`a`), düğüm (`l`) |
| Jöle Patlat | `match` | Açgözlü oyuncunun kazanma oranı | buz katmanı (`ice`) |

## Nasıl çalışır

1. Claude oyunun kurallarını, renk paletini ve hedef zorluğu alır.
2. Bir piksel resim ve ayarlar tasarlar, `evaluate_level` aracıyla ölçer:
   - Bölüm kurallara uygun mu?
   - Akıllı oyuncu kazanabiliyor mu (çözülebilir mi)?
   - Rastgele ya da açgözlü oyuncu yüzde kaç kazanıyor?
   - Yeterince engel var mı?
3. Sonuç "çok kolay", "çok zor" ya da "çözülemiyor" ise tasarımı değiştirip yeniden ölçer.
4. "Hedefte" olunca `save_level` ile kaydeder. Kaydetme aracı bölümü **yeniden ölçer**, hedefi tutmayan bölüm oyuna giremez.

Kaydedilen bölümler şu dosyalara yazılır:
- `zellybon-web/js/generated/{oyun}.json` ve `.js`: Oyun bunları otomatik yükler.
- `zellybon-api/src/level-counts.json`: Sunucunun bölüm sayıları.

## Kurulum

```bash
cd level-agent
npm install
```

`level-agent/.env` dosyası oluştur. Bu dosya GitHub'a gönderilmez:

```
ANTHROPIC_API_KEY=sk-ant-...
```

API anahtarını [console.anthropic.com](https://console.anthropic.com) adresinden alabilirsin.

## Kullanım

```bash
npm run plan -- --game shooter --count 3   # Jöle Atış için 3 yeni bölüm
npm run plan -- --game nakis               # Nakış için 1 yeni tablo
npm run plan -- --game match --count 2     # Jöle Patlat için 2 bölüm
npm run check                              # API çağırmadan araçları dene
npm test                                   # sahte API ile ajan döngüsü testi
```

Bölüm ekledikten sonra API'yi yeniden başlat ki yeni bölüm sayısını görsün. Ardından web testlerini çalıştır (`cd zellybon-web && npm test`); bu testler yeni bölümlerin de kazanılabilir olduğunu doğrular.

## Model ve maliyet

- Model: `claude-opus-5-5` (effort `high`).
- Güvenlik sınıflandırıcısı bir isteği reddederse, istek sunucu tarafında uygun bir modelle yeniden çalışır (`fallbacks: "default"`).
- Bir bölüm genelde 4–10 tur ölçüm alır. Kabaca bölüm başına birkaç yüz bin giriş token'ı eder, yani yaklaşık **0,5–1,5 $**. Resim ne kadar büyük ve hedef ne kadar zorsa maliyet o kadar artar.
- Zorluk eğrisini değiştirmek için `src/games.js` içindeki `target(k)` fonksiyonlarını düzenle.
