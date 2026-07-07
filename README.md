# Netlik — TikTok için Video Optimize Et

Tarayıcıda çalışan, sunucusuz video encode aracı. Videonu seç, TikTok'un beklediği
çözünürlük/codec/renk profiline göre yeniden encode edilsin, indir. Hiçbir dosya
hiçbir sunucuya gitmez — tüm işlem [ffmpeg.wasm](https://ffmpegwasm.netlify.app/)
ile cihazının içinde çalışır.

**Canlı demo:** https://tiktok-optimizer.pages.dev

## Özellikler

- Sürükle-bırak veya dosya seçici ile video yükleme
- Gerçek zamanlı encode ilerleme çubuğu
- Önizleme + indirme + orijinal/optimize boyut karşılaştırması
- Gelişmiş panel: CRF (kalite) ve çözünürlük ayarlanabilir
- Build step yok — tek klasör, doğrudan statik hosting'e yüklenebilir

## Varsayılan encode ayarları

| Ayar | Değer |
|---|---|
| Çözünürlük | 1080×1920 (scale + pad, en-boy oranı korunur) |
| Video codec | libx264, `profile:v high`, `level 4.2` |
| Kalite | `-crf 18 -preset slow` |
| Piksel formatı | `yuv420p` |
| Renk uzayı | `bt709` |
| FPS | kaynak fps korunur |
| Ses | AAC, 320k |
| Konteyner | MP4, `+faststart` |

CRF ve çözünürlük arayüzdeki "Gelişmiş Ayarlar" panelinden değiştirilebilir.

## Teknik

- Saf HTML/CSS/JS, framework veya build tool yok
- [@ffmpeg/ffmpeg](https://www.npmjs.com/package/@ffmpeg/ffmpeg) UMD build,
  unpkg CDN üzerinden yüklenir (npm bağımlılığı yok)
- `SharedArrayBuffer` gerektiren cross-origin isolation için `_headers` dosyasıyla
  `Cross-Origin-Opener-Policy: same-origin` ve
  `Cross-Origin-Embedder-Policy: require-corp` ayarlanır

### Neden UMD, ESM değil

`@ffmpeg/ffmpeg`'in ESM build'i çoklu dosyaya bölünmüş ve worker'ı relative
import kullanıyor — CDN'den blob URL'e çevrilince bu import'lar kırılıyor.
UMD build tek dosyada self-contained, worker'ı `importScripts` ile classic
script olarak yüklüyor, build tool olmadan CDN'den güvenilir çalışıyor.

Kütüphane `classWorkerURL` verilince worker'ı zorla `{type: "module"}` açıyor,
ama UMD worker chunk'ı classic script — bu yüzden `app.js` içinde `Worker`
constructor'ı geçici olarak override edilip worker blob URL'i classic type ile
başlatılıyor (bkz. `ensureFfmpeg()`).

## Yerel geliştirme

```bash
npx serve .
```

Tek-thread core kullanıldığı için `SharedArrayBuffer` şart değil, lokal test
için özel header gerekmez. `_headers` dosyası sadece Cloudflare Pages'te
devreye girer.

## Deploy

Cloudflare Pages Direct Upload'a hazır — build step yok:

```bash
npx wrangler pages deploy . --project-name <proje-adı>
```

## Lisans

[CC BY-NC 4.0](LICENSE) — atıfla paylaşılabilir ve değiştirilebilir, ticari
kullanım yasak.
