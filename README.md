# Mê Câu Cá — Website

Public website for the **Mê Câu Cá** freshwater-fishing community.
This website is the product: it carries the full feature set of the
companion mobile app (which is still in development and not linked
from here). Fully static Next.js export — no server needed.

- Staging: https://quangnm2293.github.io/mecauca-web/

## Pages

| Route | Content |
|---|---|
| `/` | Hero + search, stats, kind shortcuts, featured spots, latest approved catch reports, handbook highlights |
| `/bai-cau` | Directory of all spots — diacritics-insensitive search, region / province / kind filters, **map view (Leaflet) + "Gần bạn" geolocation** |
| `/bai-cau/[slug]` | One page per spot: info, map, directions, **Dự báo tại bãi** (today's fishing score, formula v2, computed in the browser), **Lịch câu tháng này** (per-spot month calendar), per-spot catch reports, **Gợi ý sửa / Báo sai** |
| `/cam-nang`, `/cam-nang/[slug]` | The 23 handbook articles from the app |
| `/bao-ca` | Community feed of approved catch reports (+ "Báo cáo" UGC flag per card) |
| `/dang-bao-ca` | Post a catch report (sign-in required; `?bai=<slug>` preselects a spot) |
| `/dong-gop` | Contribute a new spot with a map pin picker (sign-in required) |
| `/tai-khoan` | Account: Google sign-in, profile (display name, avatar colour), shortcuts |
| `/tai-khoan/bao-ca` | My catch reports with real moderation statuses |
| `/tai-khoan/dong-gop` | My spots + suggestions with real moderation statuses |
| `/kiem-duyet` | Moderation panel (moderators only): approve/reject spots & reports, apply suggestions, handle UGC reports |
| `/nhat-ky` | Personal fishing journal — local-only (browser localStorage) |
| `/gioi-thieu` | About + how community contributions work (on this website) |

## Community backend & sign-in

- The site talks to the same community backend as the app
  (`@supabase/supabase-js`, anon key in `src/lib/supabase.ts`):
  anon reads approved content; signed-in users write their own rows
  as `pending`; moderators (rows in `moderators`) read all + flip
  statuses. RLS enforces everything server-side — payloads mirror
  the app's row mapping exactly.
- **Google sign-in requirement (already configured 2026-11-01):**
  Supabase → Authentication → URL Configuration → Redirect URLs must
  contain `https://quangnm2293.github.io/mecauca-web/**`. The web
  client sends `redirectTo = <origin><basePath>/tai-khoan/`.
  Verified: the authorize endpoint 302s to Google with the redirect
  preserved. When the site is also served from another origin (the
  Vercel deployment, later a custom domain), add
  `https://<that-origin>/**` there too (no code change — the redirect
  is computed from the live origin).

## Data

- **Spots & articles** are baked in at build time by `scripts/fetch-data.mjs`:
  it fetches approved spots from the community backend (public read) and falls
  back to parsing the Flutter app's seed dataset (`../fishing-app/lib/core/spots.dart`);
  articles are copied from the app's `assets/cam_nang.json`.
  Snapshots live in `src/data/*.json` and are committed. New
  community-approved spots appear at the next rebuild (catch reports
  and pickers read live at runtime).
- **Catch reports** are fetched in the browser at runtime (approved only).
- **Forecast** is computed in the browser per spot: astronomy/fishing windows
  locally in TypeScript, weather + river discharge from keyless public feeds.
  Score formula v2 (same as the app): Thời tiết & khí áp 40 · Nhiệt độ theo
  loài 25 · Mực nước 20 · Khung giờ cá ăn 15 — components without data are
  excluded and the total renormalised; nothing is fabricated. The month
  calendar (`src/lib/calendar.ts`) is a port of the app's per-spot
  calendar: forecast-range days are "Dự báo", beyond-range days are
  windows-only "Ước tính", past days are scoreless.
- **Journal** never leaves the device: localStorage key
  `mecauca-nhat-ky`, same entry shape/stats as the app.

## Build & deploy

```bash
npm install
npm run build        # fetch-data + next build → ./out
```

Environment variables (one input set drives everything — `next.config.ts`
derives and injects the `NEXT_PUBLIC_*` values, so router, sitemap,
canonical base, map links and the auth redirect can never drift apart):

| Var | Meaning |
|---|---|
| `SITE_BASE_PATH` | The one base-path knob: Next.js `basePath`/`assetPrefix` **and** the client-side base. `/mecauca-web` for GitHub Pages staging; empty/unset for a domain root (Vercel, custom domain). |
| `SITE_ORIGIN` | Public origin for absolute URLs (sitemap, robots, metadata base), e.g. `https://<project>.vercel.app`. Default `https://quangnm2293.github.io`. (`NEXT_PUBLIC_SITE_ORIGIN` is still honoured as a fallback alias.) |
| `NEXT_PUBLIC_SITE_BASE` | Optional override of the derived client base — normally leave unset. |

Deploy to GitHub Pages staging (what we do today): build with
`SITE_BASE_PATH=/mecauca-web npm run build` (that single variable is
enough now), then push the contents of `out/` to the `gh-pages` branch:

```bash
cd out && git init && git checkout -b gh-pages   # or reuse a worktree
git add -A && git commit -m "Deploy" && git push -f origin gh-pages
touch .nojekyll   # include before committing so Pages serves _next/
```

## Deploy on Vercel (*.vercel.app)

The repo is import-ready: `vercel.json` pins the framework, build
command and output directory, and the build needs **no**
repository-specific settings for Vercel. Exact import steps:

1. Vercel dashboard → **Add New… → Project** → import
   `quangnm2293/mecauca-web`.
2. **Project Name:** choose carefully — it becomes the public
   subdomain `https://<project-name>.vercel.app`.
3. **Root Directory:** `./` (the repo root — do not change).
4. **Framework Preset:** Next.js (auto-detected; also pinned in
   `vercel.json`). Build Command `npm run build` and Output
   Directory `out` come from `vercel.json` — leave them as they are.
5. **Environment Variables:** none are required for a first deploy.
   - Do **not** set `SITE_BASE_PATH` — unset means domain root,
     which is correct for a `*.vercel.app` site.
   - Optionally set `SITE_ORIGIN=https://<project-name>.vercel.app`
     so the sitemap/robots/metadata base point at the Vercel origin
     from the very first build. If skipped, absolute URLs in the
     sitemap simply default to the GitHub Pages origin until you set
     it and redeploy — page content and in-site navigation are
     unaffected.
6. Deploy. One-time follow-up: add
   `https://<project-name>.vercel.app/**` to Supabase →
   Authentication → URL Configuration → Redirect URLs (same place as
   the existing Pages entry) or Google sign-in will refuse the
   redirect — the client computes `redirectTo` from the live origin,
   so no code change is needed. Then smoke-test sign-in once.

## Moving to a custom domain (later)

1. Point the domain's DNS at the host (GitHub Pages: CNAME → `quangnm2293.github.io`,
   plus a `CNAME` file in `out/`; or upload `out/` to any static host).
2. Rebuild with `SITE_BASE_PATH=` (empty) and
   `SITE_ORIGIN=https://<domain>`.
3. Add `https://<domain>/**` to the Supabase redirect URLs (above).
4. No code changes are needed — routing, sitemap and OG URLs follow the env vars.

## Rules that must not regress

- **No data-source names in UI copy** (the site's brand rule, same as the app).
  Map attribution stays (licence requirement).
- **No links to the mobile app** while it is in development — the
  website is the product and carries every feature itself.
- Never invent spot data: unknown species/prices/facilities stay empty with
  the honest "Cộng đồng chưa bổ sung" states.
