# Seviye yazma rehberi

Her seviye `data/levels/` içinde tek bir JSON dosyasıdır. Yeni bir seviye eklemek ya da bir seviyeyi değiştirmek
için kod yazmak gerekmez. En kolay yol, benzer bir seviyeyi kopyalayıp değiştirmektir:

| İstediğin şey | Örnek dosya |
|---|---|
| Sade karar seviyesi | `01-phished.json` |
| Log okuma bulmacası | `04-injection.json` (`logpuzzle` düğümü) |
| Alarm kuyruğu | `05-alarm.json` (`queue` düğümü) |
| Vardiya öncesi gizli seçim, müşteri göstergeleri | `06-long-weekend.json` |
| Geçmişe dönüşler, birden fazla sahne | `09-76-days.json` |
| "None of these", yanıltıcı Consult ipuçları | `10-helpful-machine.json` |
| Gerçek zamanlı yayılma sayacı, kurtarma sırası bulmacası | `11-last-copy.json` |
| Sönen ekran ışıkları | `12-lights-out.json` |

Değişiklikten sonra her zaman `node tools/validate.js` çalıştır.

## 1. Dosyanın üst kısmı

```json
{
  "id": "01-phished",
  "level": 1,
  "title": "Phished at 09:02",
  "tier": "beginner",
  "lighting": "day",
  "options": 2,
  "real": null,
  "license": "CC BY-NC-SA 4.0 — © 2026 Dilan",
  "start": { "clock": "09:12", "node": "alert" },
  "introChoice": null,
  "briefing": "Rutin introda görünen kısa metin.",
  "attacker": { ... },
  "nodes": { ... },
  "endings": [ ... ],
  "lessons": ["Raporda 'Lessons learned' altında çıkan maddeler"],
  "standards": ["Raporda 'Relevant standards' altında çıkan maddeler"],
  "whatActuallyHappened": null
}
```

- `tier`: `beginner`, `intermediate`, `advanced` ya da `master`. Şapka rengi, ortam ve ipucu kuralları buradan gelir (`data/tiers.json`).
- `lighting`: `day`, `twilight`, `night`; yeraltında `warm`, `dusk`, `dark`.
- `options`: her kararda kaç şık olacağı. Doğrulayıcı bunu kontrol eder. Karaktere özel gizli şıklar bu sayıya dahil değildir.
- `real`: gerçek olaydan esinlenen seviyede `{ "dates": "August–December 2022", "place": "..." }`. Introda "Inspired by events of …" yazar. Kurgusal seviyede `null`.
- `whatActuallyHappened`: gerçek olay seviyesinde `{ "title": "What actually happened…", "headline": "...", "hacker": "black", "paragraphs": ["..."] }`. Gerçek isimler **sadece** burada geçer. Kaynakları `docs/sources-XX.md` dosyasına yaz. (v2.0) Bu ekran gazete ön sayfası olarak açılır: `headline` gazetenin manşetidir; `hacker` sağ üstteki kapüşonlu figürün rengidir: `"black"`, `"gray"` veya `"red"` (olaya uygun olanı seç).
- `introChoice` (isteğe bağlı): vardiyadan önceki gizli seçim. `{ "at": "Fri 17:30", "prompt": "...", "choices": [{ "label", "short", "note", "wise", "effects" }] }`. (v2.0) `wise: true/false` yazılırsa seçimden sonra başka bir takım arkadaşı glitch efektiyle gelir ve seçimin doğru mu yanlış mı olduğunu söyler.
- (v2.0) Şıklar ekranda her seferinde karışık sırayla, A, B, C… diye harflenerek gösterilir; "None of these" hep en sonda kalır. Dosyadaki `key` değerleri değişmez, `docs/paths-*.md` dosyalarındaki harfler dosyadaki anahtarlardır, ekrandaki harfler değil.
- (v2.0) Sıralama bulmacası (`order`): maddeler ekranda karışık sırayla gelir. `"hideNeeds": true` yazılırsa "Needs:" satırları gösterilmez (cevabı ele veriyorsa). "The order that works" listesi oyun sırasında gösterilmez; rapor ekranında, seviye geçildiyse gösterilir.
- `clients` (isteğe bağlı): müşteri göstergeleri, `[{ "id": "dental", "name": "Dental clinic", "start": 20 }]`.

## 2. Düğümler (nodes)

Her düğüm bir karar ekranıdır. Anahtarı düğümün adıdır (`"alert"`, `"scope"`...).

```json
"scope": {
  "phase": "Containment",
  "title": "Close the door behind them",
  "body": [
    { "if": { "flag": "forwardRule" }, "text": "Bu bayrak varsa görünen metin." },
    { "text": "Hiçbir koşul tutmazsa görünen metin." }
  ],
  "logs": [ { "text": "Olay akışına düşen satır", "type": "hi" } ],
  "notes": { "iris": "Iris'in içgüdü satırı", "echo": "...", "moritz": "...", "jayson": "..." },
  "consult": { "iris": { "hint": "Consult ipucu", "misleading": false }, "echo": { ... }, ... },
  "choices": [ ... ],
  "next": [ { "if": { "flag": "x" }, "to": "baska" }, { "to": "end" } ]
}
```

- Metin alanlarının hepsi ya düz metindir ya da yukarıdaki gibi koşullu bir listedir: koşulu tutan **ilk** satır gösterilir.
- Metin içinde `{clock}` o anki saati, `{ad}` ise `setVar` ile saklanan bir değeri yazar.
- `logs.type`: `info`, `ok`, `warn`, `hi`. Log satırları spec'in 11c bölümünden gelir; yeni bir satır yazarsan yanına `TODO: author review` notu düş.
- `next`: koşulu tutan ilk hedefe gidilir. `"end"` seviyeyi bitirir.
- İsteğe bağlı alanlar: `clockAt` / `days` (saati ileri al, örneğin ertesi güne), `newScene` ve `act` (yeni sahne başlığı), `lights` (Level 12'deki sönen ekranlar), `spread` (gerçek zamanlı sayaç).

## 3. Şıklar (choices)

```json
{
  "key": "A",
  "label": "Ekranda görünen şık metni",
  "short": "Raporda görünen kısa ad",
  "effects": { "minutes": 15, "points": 10, "set": { "sessionsRevoked": true } },
  "note": "Seçtikten sonra ne olduğu",
  "why": "Neden doğru ya da yanlış",
  "whyDeep": "Moritz ile oynarken görünen daha derin, standartlara dayalı açıklama",
  "tags": ["NIST SP 800-61 · Containment"]
}
```

- `points`: 0–10 arası. Yasa dışı ya da aldatıcı bir şık eksi puan alabilir (örneğin `-10`).
- `if`: şıkkı sadece koşul tutarsa gösterir. Karaktere özel şıklar böyle yazılır: `"if": { "character": "jayson" }`.
- `characterEffects`: aynı şıkkın bir karakterde ek etkisi olur, örneğin `{ "moritz": { "meters": { "R": -5 }, "note": "..." } }`.
- `"none": true`: Master seviyelerdeki "None of these" şıkkı. Doğruysa düğümde `noneSuggestions` olmalı: `[{ "by": "moritz", "text": "...", "short": "...", "correct": true }, ...]`. Oyuncunun kendi karakteri hiç öneri yapmaz, diğerlerinden ilk ikisi görünür.

## 4. Etkiler (effects)

| Alan | Ne yapar |
|---|---|
| `minutes` | Saati ilerletir. Saldırgan aktifse bu dakikalar saldırgana da işler. |
| `points` | Karar puanı (0–10). |
| `meters` | `C` (gizlilik), `I` (bütünlük), `A` (erişilebilirlik), `R` (itibar); örnek `{ "A": -10 }`. |
| `evidence` | Kanıt göstergesi (0–100). Saldırgan aktifken kanıt zamanla azalır, Echo'da yarı hızda. |
| `money` | Zarar (dolar). |
| `set` / `unset` | Bayrak koyar ya da kaldırır. Sonlar ve sonraki metinler bu bayraklara bakar. |
| `setVar` | Metinde kullanılacak bir değer saklar; `"clock"` o anki saati saklar. |
| `clients` | Müşteri göstergelerini değiştirir, örnek `{ "law": 10 }`. |

## 5. Koşullar

`{ "flag": "x" }`, `{ "not": {...} }`, `{ "all": [...] }`, `{ "any": [...] }`,
`{ "gte": ["evidence", 40] }`, `{ "lt": ["attackerMinutes", 20] }`, `{ "character": "echo" }`.

## 6. Saldırgan (kelebek etkisi)

```json
"attacker": {
  "activeWhile": { "not": { "flag": "sessionsRevoked" } },
  "events": [
    { "at": 15, "flag": "forwardRule", "meters": { "C": -15 }, "text": "Ne oldu", "log": "Akışa düşen satır" },
    { "onEnter": "invoice", "if": { "flag": "forwardRule" }, "penalty": 10, "text": "..." }
  ]
}
```

- `at`: saldırgan bu kadar dakika aktif kaldığında olay tetiklenir. `onEnter`: oyuncu o düğüme girdiğinde tetiklenir.
- `penalty`: ağır sonuçlarda puan cezası. Kötü bir sonun %70'e ulaşmaması için kullanılır.
- `because`: zincirde gösterilecek nedeni elle yazar (örneğin önceki bir perdedeki karar).

## 7. Sonlar (endings)

```json
{ "if": { "all": [ { "flag": "paid" }, { "not": { "flag": "sessionsRevoked" } } ] },
  "grade": "Rooted", "tone": "bad", "text": "..." }
```

- Koşulu tutan **ilk** son seçilir. Son sıradaki sonun `if` alanı olmamalı (yedek son).
- `tone`: `good`, `mixed` ya da `bad`. Kötü bir sonla seviye hiçbir yolda %70'i geçmemeli; doğrulayıcı bunu kontrol eder.

## 8. Yeni seviyeyi oyuna eklemek

1. Dosyayı `data/levels/` içine koy.
2. `data/levels/index.json` içinde o seviyenin satırına `"ready": true` yaz (yeni bir seviyeyse satırı ekle).
3. `node tools/validate.js` çalıştır. "All levels valid." yazmalı.
4. Oyunu tarayıcıda açıp en az bir kez baştan sona oyna.

## İçerik kuralları

- Sadece savunma. Exploit, payload, zararlı yazılım kodu, gerçek anahtar formatı ya da çalışan saldırı adımı yok.
- Kamuya açık IP adresleri sadece belgeleme aralıklarından: `192.0.2.x`, `198.51.100.x`, `203.0.113.x`.
- Oyundaki kişi ve şirketler kurgusal. Gerçek isimler sadece "What actually happened…" ekranında.
- Emin olmadığın bir bilgiyi `TODO: verify` ile işaretle.
