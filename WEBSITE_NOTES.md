# WEBSITE_NOTES — Mê Câu Cá website (V1, built 2026-11-01)

## What was built

- **Repo:** https://github.com/quangnm2293/mecauca-web (public)
  - `main` = Next.js source; `gh-pages` = static export, served by GitHub Pages.
- **Staging (live):** https://quangnm2293.github.io/mecauca-web/
- **Stack:** Next.js 15 (App Router, TypeScript), `output: 'export'`, plain CSS
  (design tokens ported from the Flutter app: deep emerald `#0B6E4F`, amber
  `#F59E0B`, per-kind colours). `trailingSlash: true`; `basePath`/`assetPrefix`
  from `SITE_BASE_PATH` env so the identical build can move to a custom-domain
  root by config only.
- **Pages generated: 144 routes** — home, /bai-cau, /bao-ca, /cam-nang,
  /gioi-thieu, **111 spot pages** (110 app seeds + 1 community-approved spot),
  **23 article pages**, sitemap.xml (139 URLs), robots.txt.

## Data approach

- **Live fetch won:** `scripts/fetch-data.mjs` (runs as part of `npm run build`)
  fetched **111 approved spots** from the community backend REST (anon read) —
  so the site already includes community spots, and `serverId` (backend uuid)
  is stored per spot. Fallback (parse of the app's `spots.dart`) implemented
  and ready; snapshot committed at `src/data/spots.json`.
- Articles copied from the app's `assets/cam_nang.json` → `src/data/articles.json`.
- **Catch reports:** browser-side fetch of approved rows only, joined to spots
  via a runtime id map; used on home (latest 6), /bao-ca (latest 30) and each
  spot page. Empty states are honest ("Chưa có báo cá nào…").
- **Forecast ("Dự báo tại bãi"):** the app's astronomy engine and score
  formula v2 were ported to TypeScript (`src/lib/astro.ts`, `src/lib/score.ts`,
  `src/lib/forecast.ts`) — components: Thời tiết & khí áp 40 · Nhiệt độ theo
  loài 25 · Mực nước 20 (river-discharge trend, else 3-day-rain proxy, else
  excluded) · Khung giờ cá ăn 15; renormalisation over present components,
  exactly like the app. Verified live on build day: Trị An scored 77 with all
  four components (discharge data present), HCMC sunrise 05:45 matches the app.
- **Map:** OpenStreetMap embed iframe per spot + Google Maps directions link;
  OSM attribution retained (licence).
- **Brand rule held:** grep of the exported HTML for source names
  ("Open-Meteo" / "Solunar" / "Supabase") = 0 hits in rendered copy.

## Deliberately V2 (not in V1)

- Full month fishing calendar per spot on the web (app has it; web shows
  today + next 2 days).
- Web contributions / Google login / moderation — contributions stay in the
  app; the website is read-only and says so on /gioi-thieu.
- Custom domain (user chose free GitHub Pages staging first, 2026-11-01).
  Move = DNS + rebuild with empty `SITE_BASE_PATH` + `NEXT_PUBLIC_SITE_ORIGIN`
  set — see README.
- Dark-mode toggle (website is light-theme only in V1).
- Rebuild automation: spot data refreshes when someone re-runs the build and
  re-deploys `gh-pages`; a scheduled rebuild (GitHub Actions cron) is the
  natural V2 step so new community spots appear without manual builds.

## User actions pending

- None for staging. When he picks a domain (e.g. a mecauca-style .vn): buy it,
  then DNS per README and one rebuild — no code changes.
