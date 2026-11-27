# Troubleshooting: "YouTube API request failed"

Endpoint: `GET /api/youtube/search?q=...` (butuh `Authorization: Bearer <APP_API_TOKEN>`).

## Cara membaca error

Respons 502 sekarang menyertakan petunjuk aman (tanpa body error upstream, tanpa API key):

| Respons | Arti | Tindakan |
|---|---|---|
| `{ error: "YouTube API request failed", upstreamStatus: 400 }` | API key tidak valid / salah format | Set ulang secret `YOUTUBE_API_KEY` (hati-hati spasi/newline di ujung) |
| `{ error: "YouTube quota/permission error", upstreamStatus: 403 }` | Kuota habis, YouTube Data API v3 belum diaktifkan, atau key dibatasi (referrer/IP) | Cek Google Cloud Console: API enabled, quota, restriction key |
| `{ error: "YouTube API request failed", upstreamStatus: 404/5xx }` | Masalah di sisi YouTube | Coba lagi nanti |
| `{ error: "YouTube API request failed", reason: "network" }` | `fetch` dari Worker gagal (bukan timeout) | Lihat log `YouTube fetch failed` |
| `{ error: "YouTube API timeout" }` (504) | Upstream lebih dari 8 detik | Coba lagi |

## Log

```bash
wrangler tail
```

Cari baris `YouTube upstream error` (berisi `status`) atau `YouTube fetch failed` (berisi `name`/`message`).
URL upstream sengaja **tidak** di-log karena query string-nya memuat API key.

## Set ulang secret

```bash
wrangler secret put YOUTUBE_API_KEY
```

Verifikasi lewat `GET /api/health`: `youtubeDiscovery: true` hanya berarti secret ada, bukan berarti key valid.
