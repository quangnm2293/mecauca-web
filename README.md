# Mê Câu Cá — Website

Public, SEO-friendly website for the **Mê Câu Cá** freshwater-fishing community
(companion to the Flutter app). Fully static Next.js export — no server needed.

- Staging: https://quangnm2293.github.io/mecauca-web/
- App: https://quangnm2293.github.io/khongmom-cauca-test/

## Pages

| Route | Content |
|---|---|
| `/` | Hero + search, stats, kind shortcuts, featured spots, latest approved catch reports, handbook highlights |
| `/bai-cau` | Directory of all spots — diacritics-insensitive search, region / province / kind filters |
| `/bai-cau/[slug]` | One page per spot: info, map, directions, **Dự báo tại bãi** (today's fishing score, formula v2, computed in the browser), per-spot catch reports |
| `/cam-nang`, `/cam-nang/[slug]` | The 23 handbook articles from the app |
| `/bao-ca` | Community feed of approved catch reports |
| `/gioi-thieu` | About + how community contributions work (in the app; the website is read-only in V1) |

## Data

- **Spots & articles** are baked in at build time by `scripts/fetch-data.mjs`:
  it fetches approved spots from the community backend (public read) and falls
  back to parsing the Flutter app's seed dataset (`../fishing-app/lib/core/spots.dart`);
  articles are copied from the app's `assets/cam_nang.json`.
  Snapshots live in `src/data/*.json` and are committed.
- **Catch reports** are fetched in the browser at runtime (approved only).
- **Forecast** is computed in the browser per spot: astronomy/fishing windows
  locally in TypeScript, weather + river discharge from keyless public feeds.
  Score formula v2 (same as the app): Thời tiết & khí áp 40 · Nhiệt độ theo
  loài 25 · Mực nước 20 · Khung giờ cá ăn 15 — components without data are
  excluded and the total renormalised; nothing is fabricated.

## Build & deploy

```bash
npm install
npm run build        # fetch-data + next build → ./out
```

Environment variables:

| Var | Meaning |
|---|---|
| `SITE_BASE_PATH` | Next.js `basePath`/`assetPrefix`. `/mecauca-web` for GitHub Pages staging, empty for a custom-domain root. |
| `NEXT_PUBLIC_SITE_BASE` | Same value; used for absolute URLs in sitemap/OG. |
| `NEXT_PUBLIC_SITE_ORIGIN` | Origin for absolute URLs (default `https://quangnm2293.github.io`). |

Deploy to GitHub Pages staging (what we do today): push the contents of
`out/` to the `gh-pages` branch:

```bash
cd out && git init && git checkout -b gh-pages   # or reuse a worktree
git add -A && git commit -m "Deploy" && git push -f origin gh-pages
touch .nojekyll   # include before committing so Pages serves _next/
```

## Moving to a custom domain (later)

1. Point the domain's DNS at the host (GitHub Pages: CNAME → `quangnm2293.github.io`,
   plus a `CNAME` file in `out/`; or upload `out/` to any static host).
2. Rebuild with `SITE_BASE_PATH=` (empty) and
   `NEXT_PUBLIC_SITE_ORIGIN=https://<domain>`, `NEXT_PUBLIC_SITE_BASE=`.
3. No code changes are needed — routing, sitemap and OG URLs follow the env vars.

## Rules that must not regress

- **No data-source names in UI copy** (the site's brand rule, same as the app).
  Map attribution stays (licence requirement).
- Never invent spot data: unknown species/prices/facilities stay empty with
  the honest "Cộng đồng chưa bổ sung" states.
