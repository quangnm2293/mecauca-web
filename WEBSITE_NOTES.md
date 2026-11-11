# WEBSITE_NOTES — Mê Câu Cá website

## fetch-data pagination: the 1,000-row PostgREST trap is FIXED ahead of the 1,762 rebuild (2026-11-11, late evening)

`scripts/fetch-data.mjs` previously fetched approved spots with a
single `limit=1000` request — and PostgREST caps every response at
1,000 rows, so once the backend passes 1,000 approved spots (it will
hold **1,762** after the owner's two lake SQL files run), a rebuild
would have **silently truncated the site to 1,000 spots**, dropping
762 lakes with no error anywhere. `fetchLive()` now pages through
with `limit`+`offset` until a short page returns, accumulating ALL
rows before the usual row→snapshot mapping; ordering
(`order=name.asc`), the <50-row sanity check, the snapshot
write-back and the Dart/committed-snapshot fallbacks are unchanged.
Page size defaults to 1,000 and can be overridden with
`FETCH_PAGE_SIZE` (exists to test pagination).

Verified against the CURRENT live backend (663 approved spots,
under the cap, so behaviour today must be identical): default run →
`663 spots from live backend`, 663 unique slugs, all with serverId.
Pagination proof with small pages: `FETCH_PAGE_SIZE=250` (3 pages)
and `=100` (7 pages) both accumulate exactly 663 unique rows;
`=221` (663 = 3×221, exact multiple) terminates correctly on the
trailing empty page with 663. `node --check` + `tsc --noEmit` pass.
After verification the committed snapshot was restored to 1,762 —
it stays that way until the owner's SQL runs land and the site is
rebuilt (this fix is committed/pushed only; **no redeploy**).

## Lake expansion ingested (web-only): 454 natural lakes + 645 reservoirs in snapshot + SQL, pending owner's 2 SQL runs (2026-11-11, late evening)

Owner approved **454 natural lakes + 654 reservoirs** on 11/11
evening ("Nhập 454 hồ tự nhiên + 654 hồ chứa — lên 1.771 bãi").
Ingestion is WEB-ONLY (app shelved 11/11 19:21 — the Dart
generator was NOT used; SQL was generated from the candidates
JSON by script). What landed in this commit:

- `src/data/candidates-reservoirs-batch1.json` (NEW): the OSM
  harvest appendix `~/natural_work/reservoirs_final.json`
  converted to the standard candidates schema (kind `hoChua`,
  kindLabel `Hồ chứa`, species [] / ticketNote null throughout,
  descriptions from file facts only, area via the harvest's
  `fmt_area` labelled "ước tính từ đường viền bản đồ
  OpenStreetMap"; sourceUrls/recencyNote mirror the natural
  batch: OSM way/relation + GADM province check 11/2026).
- **Validation of the 654 reservoirs:** all provinces in the
  34-province set, all pins inside the Vietnam bbox, **zero
  collisions** against the 663 existing + 454 natural (no
  normalised-name match within 500 m, nothing within 150 m;
  the 4 pairs at 172–404 m have different names = distinct
  water bodies, kept; all name-equal pairs are ≥3 km apart).
  No internal duplicates. 13 base slugs collided with existing
  slugs and 21 were duplicated internally — resolved with the
  harvest slug rule (bare → `-province` → `-province-2`…),
  no drops for slug reasons.
- **9 rows DROPPED as non-lakes** (the reservoirs appendix had
  never received the natural batch's name-cleanup pass; all
  ≤0.3 ha, names denote infrastructure, not fishable water):
  Giếng thôn Đông, Giếng đình Mai Động, Giếng Xóm Đông,
  Giếng Xóm Tây (village wells, Hà Nội), Bể nước (Vĩnh Long),
  Bể chứa nước (Khánh Hòa), Bể Bơi Tiến Phương (swimming pool,
  Ninh Bình), Đài Phun Nước (fountain, Lâm Đồng), Trạm Cấp
  Nước Hương Canh (water-supply station, Hà Nội). Reservoirs
  therefore land at **645**, not 654: new total 454 + 645 =
  **1,099**, platform **663 + 1,099 = 1,762** (not 1,771).
  Dropped rows remain in `~/natural_work/reservoirs_final.json`
  if the owner ever wants them back.
- `sql/supabase-them-454-ho-tu-nhien.sql` (454 rows) +
  `sql/supabase-them-645-ho-chua.sql` (645 rows), mirrored to
  `~/workspace/your_files/`. Exact batch-3 INSERT shape
  (same column list, `client_id` = slug, `'seed'/'approved'`,
  `ON CONFLICT (client_id) DO NOTHING`, `ARRAY[...]`/`'{}'`
  array style, `''` quote escaping). Format proof: the
  generator reproduces the real batch-3 SQL **byte-identically
  for 443/444 rows** from `candidates-batch3-2026-11-11.json`;
  the one differing row is `ho-cau-dong-phuong`, whose debris
  species field was sanitised at ingestion time (documented
  then) — a data difference, not a format one. Row counts and
  client_id sets verified equal to the candidate slug sets.
- `src/data/spots.json` merged **663 → 1,762** (pure tail
  insertion, first 663 entries untouched; new entries
  `serverId: null`; reservoir kindLabel `Hồ chứa / đập` per
  the snapshot/fetch-data convention, candidates file keeps
  `Hồ chứa` per the batch-3 candidates convention). New
  breakdown: hồ chứa 682 · hồ dịch vụ 561 · hồ tự nhiên 475 ·
  sông 44; Bắc 663 / Trung 806 / Nam 293.

**Pending:** owner runs the 2 SQL files in the Supabase SQL
Editor, in order (454 natural → 645 reservoirs), then the
site is rebuilt → 1,762. The website was NOT redeployed in
this step; production builds still fetch the live backend
(663) — expected.

**⚠️ REBUILD TRAP (fix before the 1,762 rebuild):**
`scripts/fetch-data.mjs` fetches `limit=1000` from PostgREST,
which also caps responses at 1,000 rows — after the SQL runs
the backend will hold 1,762 approved spots but the build
would silently keep only 1,000. Paginate (offset/Range) or
raise the cap in `fetchLive()` before rebuilding for 1,762.

## Hero vs calendar today-score divergence — FIXED + LIVE both hosts (2026-11-11, evening)

Owner's screenshots (Hồ câu Thanh An, Quảng Trị): the "Dự báo
tại bãi" hero said **52** ("Ngày trung bình") while the month
calendar's day-11 cell and detail said **36** ("Ngày xấu") — both
labelled "hôm nay". Root cause (verified in code): both surfaces
run `lib/score.ts` `computeScore`, but the hero feeds it FROM-NOW
inputs (pressure trend now vs 3h ago, 72h swing, current
wind/gust, rain over the REST of today, current temperature,
water windows aligned to now) while `computeCalendarDays` fed
today the WHOLE-day inputs (15:00−12:00 trend, within-day swing,
daily-max wind/gust, whole-day rain, daily-mean temperature).
After a rough morning the two legitimately diverge.

**Fix:** the hero's input mapping was extracted into ONE shared
helper, `scoreFromCurrent(windows, weather, water, species)` in
`src/lib/forecast.ts`, now used by `SpotForecast` (hero) and by
`SpotCalendar`, which additionally fetches `fetchWeather` +
`fetchWaterInputs` and — once they load — replaces today's
calendar entry (cell + day detail) with the from-now score,
`isForecast`/`Dự báo` kept. All other days keep the whole-day
computation (correct for days that have not started); if the
current-conditions fetch fails, today's whole-day entry remains
as the fallback. The app-faithful calendar port in
`src/lib/calendar.ts` is untouched apart from a pointer comment.
No unit-test framework exists in this repo (checked package.json)
— verification was `tsc --noEmit` clean + both production builds.

**Deployed both hosts, verified live:** Vercel deployment
`mecauca-lpoy97vv2` (READY; spot page 200, served page chunk
contains the override construction — `new Map(days).set(today,
{…, isForecast:!0, basisLabelVi:"Dự báo", score:
scoreFromCurrent(windows, weather…)})`; CSS unchanged
`e368a40cfaf708ba.css`). GitHub Pages gh-pages `055e0c1`: spot
page 200 serving page chunk `page-f39d68a28fe120ea.js`,
byte-size-identical to the Vercel-served chunk (41,172 bytes)
with the same override code; CSS unchanged
`4adffbc6987b2176.css`. Both builds carry the 663-spot dataset.

## 663 LIVE on both hosts — campaign closed (2026-11-11, evening)

The owner ran all three batch SQL files in the Supabase SQL
Editor; anon REST count of approved spots = **663 exactly**.
Rebuilt and redeployed both hosts the same evening:

- **Data path:** the build-time fetch used the LIVE backend,
  not the fallback — `fetch-data: 663 spots from live backend`
  on both builds, and the refreshed `src/data/spots.json` now
  carries real `serverId`s for all 663 (0 null, was 552).
  Snapshot and backend agree at 663.
- **Vercel:** build with `SITE_ORIGIN=https://mecauca.vercel.app`,
  base path empty; `npx vercel deploy --prod --yes` → READY,
  production https://mecauca.vercel.app (deployment
  `mecauca-ptyyekwqq`). Verified live: home 200 with the "663"
  total, `/bai-cau/ho-cau-dai-yen-son/` 200 (Lạng Sơn's first
  spot), sitemap 693 URLs (664 under `/bai-cau/` = 663 spots +
  the index), redesign CSS `e368a40cfaf708ba.css` unchanged.
- **GitHub Pages:** build with `SITE_BASE_PATH=/mecauca-web`,
  gh-pages commit `8d6f12e`. Verified live with the same checks:
  home 200 + "663", the Lạng Sơn spot page 200, sitemap 693
  URLs, redesign CSS `4adffbc6987b2176.css` unchanged.
- Export shape: 703 static pages, 663 spot directories.

The 500-spot campaign is complete: **663 spots, 34/34
provinces** (hồ dịch vụ 561 · sông 44 · hồ chứa 37 ·
hồ tự nhiên 21; Bắc 373 / Trung 139 / Nam 151 per snapshot).

## Spot ingestion batch 3 — snapshot at 663, 500 target exceeded, redeploy pending owner's 3 SQL runs (2026-11-11)

Batch 3 of the 500-spot campaign (`src/data/candidates-batch3-
2026-11-11.json`, 444 vetted spots: Bắc 282 · Trung 91 ·
Nam 71 across 29 provinces; hồ dịch vụ 430 · hồ tự nhiên 9 ·
hồ chứa 3 · sông 2) was merged into the bundled snapshot
`src/data/spots.json`: **219 → 663 complete** — the
campaign target of 500 is exceeded. Snapshot breakdown:
hồ dịch vụ 561 · sông 44 · hồ chứa 37 · hồ tự nhiên 21;
Bắc 373 / Trung 139 / Nam 151; provinces **34/34**
(Lạng Sơn's first spot: `ho-cau-dai-yen-son`).
Cross-checked: snapshot = the app's 662 seeds + exactly
the 1 community-approved spot; the spots.json diff is
pure insertions (no reformatting of prior entries). New
entries carry `serverId: null` (552 in total across
batches 1–3): their backend rows do not exist yet. One
documented sanitation, shared with the app dataset and
the SQL file: `ho-cau-dong-phuong`'s candidate `species`
field is scrape debris (rulebook text + JSON fragments),
dropped to `[]` here too; everything else is verbatim.

**Still NOT redeployed, deliberately**: Supabase gains
the new spots only after the owner runs ALL THREE batch
files — `~/workspace/your_files/supabase-them-36-bai-11-11.sql`,
`~/workspace/your_files/supabase-them-72-bai-dot-2.sql` and
`~/workspace/your_files/supabase-them-444-bai-dot-3.sql` —
once each, in order, in the Supabase SQL Editor. Redeploy
(Vercel + GitHub Pages) happens right after those runs so
the build-time fetch and the snapshot agree at 663. The
fetch script's fallback logic was NOT touched.

## Spot ingestion batch 2 — snapshot at 219, redeploy pending owner's SQL runs (2026-11-11)

Batch 2 of the 500-spot campaign (`src/data/candidates-batch2-
2026-11-11.json`, 72 vetted small ponds: Hà Nội +41 · TP.HCM
+18 · Phú Thọ +7 · Lâm Đồng +6) was merged into the bundled
snapshot `src/data/spots.json`: **147 → 219 complete**.
Snapshot breakdown: hồ dịch vụ 131 · sông 42 · hồ chứa 34 ·
hồ tự nhiên 12; Bắc 91 / Trung 48 / Nam 80; provinces 33/34.
Cross-checked: snapshot = the app's 218 seeds + exactly the 1
community-approved spot; all batch-2 fields match the
candidates file verbatim. New entries carry `serverId: null`
(108 in total across batches 1+2): their backend rows do not
exist yet.

**Still NOT redeployed, deliberately**: Supabase gains the
new spots only after the owner runs BOTH
`~/workspace/your_files/supabase-them-36-bai-11-11.sql`
(batch 1) and `~/workspace/your_files/supabase-them-72-bai-dot-2.sql`
(batch 2), once each in the Supabase SQL Editor. Redeploy
(Vercel + GitHub Pages) happens right after those runs so the
build-time fetch and the snapshot agree at 219. The fetch
script's fallback logic was NOT touched.

Process note: batch 1's snapshot merge was an *uncommitted*
working-tree change; it was reconstructed losslessly during
this batch (111 committed + 36 batch-1 + 72 batch-2, verified
by counts, slug sets and field-level diffs) after a git
checkout briefly reverted the file to the committed 111.

## Spot ingestion — snapshot at 147, redeploy pending owner's SQL run (2026-11-11)

The 36 owner-approved crawl candidates
(`src/data/candidates-2026-11-11.json`, all 36 approved incl. the
7 flagged) were merged into the bundled snapshot
`src/data/spots.json`: **111 → 147 complete**. Snapshot breakdown:
hồ dịch vụ 64 · hồ chứa 34 · hồ tự nhiên 10 · sông 39; Bắc 43 /
Trung 42 / Nam 62; provinces 33/34. (The snapshot runs one ahead
of the app seeds — 147 vs 146 — because it also carries the 1
community-approved spot.) New entries carry `serverId: null`:
their backend rows do not exist yet.

**NOT redeployed, deliberately**: the build-time fetch reads
Supabase, which gains the 36 only after the owner runs
`~/workspace/your_files/supabase-them-36-bai-11-11.sql` once in
the Supabase SQL Editor. Redeploy (Vercel + GitHub Pages) happens
right after that run, so the fetched data and the snapshot agree
at 147 and the new spots get their serverIds/pages. The fetch
script's fallback logic was NOT touched.

## ReviewHub-style redesign (2026-11-11)

Owner, on the Vercel screenshot: "header hơi lệch, làm lại giao diện
cho đẹp như reviewhub nhưng giữ tông màu này" — the header read as
misaligned/unpolished; he wants ReviewHub's design quality in this
site's own emerald + amber palette.

**Diagnosis of "lệch":** the header and body shared the `.wrap`
container on paper, but nothing enforced it visually — the logo mark
was a soft-shadow gradient tile, the wordmark plain system font, nav
links borderless text at a different height (39px) than the logo
(34px) with no shared centre line, and no current-page state.
Measured on the old build (headless): logo top 13 / height 34,
nav top 10.4 / height 39.25 — visibly off-axis.

**Design tokens (globals.css):** warm green-tinted paper
`--paper: #FAF8EE` (ReviewHub cream, green-shifted); green-black ink
`--ink: #14342A`; `--bd: 2px solid ink` on cards, panels, buttons,
inputs, header; hard offset shadows — cards `5px 5px 0 #B9D2BD`
(solid soft-green ink), buttons/pills `3px 3px 0 ink`; press-down
hover/active everywhere (translate into the shadow, shadow shrinks
to 0); radius 16px. Fonts self-hosted in `src/app/fonts/` (24 woff2,
~250KB, subsetted vietnamese/latin-ext/latin, emitted by webpack to
`_next/static/media/` so URLs are basePath-correct on both hosts):
**Space Grotesk** 500/600/700 for headings, numbers, logo, score;
**Be Vietnam Pro** 400–800 for body. `html { scrollbar-gutter:
stable }` so the centred column never shifts between short/long
pages.

**Header (the explicit fix):** sticky paper bar with a 2px ink
bottom border; logo lockup = 40px emerald-gradient tile with ink
border + `3px 3px 0 ink` shadow + Space Grotesk wordmark with "Cá"
in emerald over an amber swipe; nav links are pills (transparent
2px border at rest so nothing shifts; hover = card bg + ink border
+ hard shadow; press on active); **current page** = amber-soft pill
+ ink border + shadow via a new client `MainNav` (usePathname,
basePath-agnostic, `aria-current="page"`); the CTA stays an emerald
pill, the account/"Đăng nhập" entry is now a bordered chip with an
ink-ringed avatar. Everything in the bar is 40px tall on one centre
line (verified: logo centre == nav centre == 33px in a 68px bar).
Mobile two-row wrap from the responsive pass is preserved exactly
(logo + CTA row 1, account + links row 2).

**Everywhere else, same language:** hero is now an emerald PANEL
(ink border, `7px 7px 0 ink` shadow) inside the container, headline
with an amber marker swipe under "Câu Cá", the search is one chunky
bordered pill control with the amber button inside it, stats are
bordered translucent mini-cards (flex-sized, 2×2 on phones);
section headings get tilted edge badges (Top / Mới / Hay / 4 loại
bãi) and their "view all" links became mini press pills; cards keep
their kind-coloured top band (6px) over the ink border (articles =
orange band, reports = amber band); kind shortcuts, filter panel,
form inputs (ink border + hard shadow on focus), chip buttons,
picker, modals, Leaflet boxes, calendar (bordered cells, ink-ringed
score badges, press nav buttons), journal stat cards, status/type
chips, footer (ink top border, display-font headings) — all moved
to the same tokens. Bonus fix found on the way: `.comp-bar` was an
inline span whose track collapsed (invisible stubs) — now
`display: block`, so forecast bars always render as proper tracks.

**Behaviour preserved + verified** (headless Chrome on the local
export, before/after): overflow = 0 at 1280/768/390 on every audited
route (8 routes at 768, 4 at 1280+390); header inner left/right ==
main container left/right to the pixel at 1280 (72.5/1192.5) and
390 (0/375, logo exactly on the 16px content edge); fonts confirmed
loaded via `document.fonts.check` (17 faces); full-card click on a
SpotCard's padding corner still navigates (stretched link intact);
Leaflet, auth, forms untouched (CSS/markup-shell changes only).

## Current state (V2, 2026-11-01) — full app feature parity, app hidden

User order (2026-11-01): "cho phép dùng tất cả chức năng của app ở web,
ứng dụng đang phát triển nên tạm ẩn đi đã" — every app feature now runs
on the website; the app is hidden.

- **App hidden:** every CTA/link to the Flutter web app was removed
  (header CTA, footer, home CTA band, /gioi-thieu, /bao-ca, spot
  pages, handbook copy). Grep of the exported build for the app's
  test-site name = **0 hits**; "Mở ứng dụng" = 0. /gioi-thieu presents
  the WEBSITE as the product and mentions the mobile app only as
  "đang được phát triển" (footer note + about section), no links.
  The Flutter test site itself is untouched (owner's private test bed).
- **Routes: 151 static routes** (was 144) — new: `/dang-bao-ca`,
  `/dong-gop`, `/nhat-ky`, `/tai-khoan`, `/tai-khoan/bao-ca`,
  `/tai-khoan/dong-gop`, `/kiem-duyet`; sitemap 141 URLs (account /
  journal / moderation pages are `noindex` and excluded).
- **Stack additions:** `@supabase/supabase-js` (auth + all community
  reads/writes, `src/lib/supabase.ts` — a faithful port of the app's
  backend layer incl. payload shapes and the moderation-queue joins),
  `leaflet` (loaded only on /bai-cau and /dong-gop via next/dynamic).
- **Features, all client-side on the same backend/RLS:**
  1. **Tài khoản + Google sign-in** — `/tai-khoan`: signInWithOAuth
     with `redirectTo = origin + basePath + /tai-khoan/`; profile row
     created on first sign-in (Google name default), display name +
     avatar colour editable; shortcuts to my content; the
     "Kiểm duyệt nội dung" entry + pending badge appear ONLY for
     users in `moderators` (same own-row check as the app).
  2. **Map explore** — /bai-cau gains a Danh sách/Bản đồ toggle:
     Leaflet + OSM tiles (attribution kept), kind-coloured circle
     markers (app hues), popup → spot page; the signed-in user's own
     pending spots ride along as amber markers. **Gần bạn**: browser
     geolocation only on tap, position kept in memory only (never
     stored/sent), list sorts nearest-first with "Cách bạn ~…" lines,
     map centres on the user; denial shows one dismissible message.
  3. **Month calendar** — `src/lib/calendar.ts` is a line-faithful
     port of the app's spot_calendar.dart on top of the existing TS
     forecast engine: "Dự báo" (solid badge) in forecast range,
     "Ước tính" (outline, windows-only) beyond, past days scoreless,
     nav clamped Jan-this-year … +2 months; day detail = score,
     verdict, basis chip, 4 component rows, windows, moon/sun line.
  4. **Đăng báo cá (full)** — `/dang-bao-ca`: searchable spot picker
     modal (port of the app's new SpotPickerPage: foldVi matching by
     name OR province, × clear, "Không tìm thấy bãi nào"), species
     quick chips, weight (decimal comma ok), bait, note, display
     name (prefilled from profile), date; validation mirrors the
     app; sticky submit bar; insert → catch_reports pending with
     client_id. **Web rule: posting requires sign-in** (the app's
     local queue was not ported — stated plainly in the UI). "Báo cá
     của tôi" lists real server statuses.
  5. **Đóng góp bãi** — `/dong-gop`: centre-pin Leaflet picker (the
     app's pattern; click also recentres), 34-province dropdown,
     kind, species chips + free-text extras, facilities chips, ticket
     note with the honesty conventions spelled out; insert → spots
     pending. Statuses in "Đóng góp của tôi".
  6. **Gợi ý sửa / Báo sai** — on every spot page: field dropdown
     (the app's 7 fields), corrected text, note → spot_suggestions
     pending; plus "Báo cáo" UGC flags (reason dialog) on feed cards,
     spot report cards and the spot itself → reports_moderation.
  7. **Nhật ký câu** — `/nhat-ky`: localStorage (`mecauca-nhat-ky`),
     same fields/stats as the app (trips / có cá / móm / tỉ lệ móm),
     clearly labelled device-only.
  8. **Kiểm duyệt nội dung** — `/kiem-duyet` mirrors the in-app
     admin: filter chips with counts, Duyệt/Từ chối for spots and
     reports, **Áp dụng** for suggestions via the ported
     suggestion-patch logic (list split, VN-bbox coordinate
     validation incl. decimal-comma parsing, 'Khác' = mark applied
     only; invalid coords block the apply and keep the suggestion
     pending), Đã xử lý/Bỏ qua for UGC reports; author names, target
     labels and current-value compare in the apply sheet, all ported.
     Non-moderators: entry hidden + page guard (RLS enforces anyway).
- **Sign-in is LIVE, not just wired:** the owner added
  `https://quangnm2293.github.io/mecauca-web/**` to Supabase Redirect
  URLs on 2026-11-01; verified from here — `GET /auth/v1/authorize?
  provider=google&redirect_to=.../tai-khoan/` returns 302 to
  accounts.google.com with the redirect preserved (PKCE code flow;
  supabase-js exchanges on return). Only the owner's own click-through
  remains untested by us (needs his Google account).
- **Not ported (deliberate):** report-form photo & count fields — the
  app itself has neither (its form note says photos come later) and
  the schema has no columns for them; the app's journal photo note is
  carried over verbatim. The app's offline local contribution queue
  (web requires sign-in instead). Profile stats beyond counts of my
  reports/contributions.
- **Deploy:** source commit `290341a` (main), gh-pages `d75a807`.
  Curl-verified live: home, /bai-cau, a spot page (calendar +
  suggestion sections present), /bao-ca, /dang-bao-ca, /dong-gop,
  /nhat-ky, /tai-khoan (+ both subpages), /kiem-duyet, sitemap — all
  200; live home HTML has 0 app references and the new CTAs.

## Vercel readiness (2026-11-10)

Owner decision: put the website on Vercel under a `*.vercel.app`
domain (the exact subdomain name is being confirmed with him in
parallel — everything below is name-agnostic). This pass only makes
the repo import-ready; **nothing was deployed to Vercel** and the
live GitHub Pages site is untouched.

**What was coupled to GitHub Pages (audit findings):**
- **Two independent base-path knobs for the same value:**
  `SITE_BASE_PATH` (read by `next.config.ts` for the router) vs
  `NEXT_PUBLIC_SITE_BASE` (read by client code, **defaulting to the
  literal `/mecauca-web`**). A no-env Vercel build would have run the
  router at the domain root while sitemap/robots/metadata base, the
  Supabase OAuth `redirectTo` (`origin + SITE_BASE + /tai-khoan/`)
  and the Leaflet popup links still carried `/mecauca-web` — broken
  absolute URLs and a refused sign-in redirect.
- **Origin literal:** `SITE_ORIGIN` defaulted to
  `https://quangnm2293.github.io` in `src/lib/types.ts` — correct as
  the Pages default, but it had to come from deploy-time env on
  Vercel.
- **`scripts/fetch-data.mjs` crash risk off-Pages:** if the live
  backend fetch failed, the fallback parsed the sibling Flutter
  checkout (`../fishing-app`), which does not exist in a Vercel
  build, and the build died — even though committed snapshots exist.
- Verified NOT coupled: all canonical/OG plumbing flows through
  `siteUrl()` (`layout.tsx` metadataBase, `sitemap.ts`, `robots.ts`);
  per-page OpenGraph blocks carry no URLs at all; no other
  `github.io` strings exist in code or copy (the only other absolute
  URLs are external services: OSM embed/tiles, directions links, the
  backend itself).

**Changes:**
- `next.config.ts` is now the single source of truth: from
  `SITE_BASE_PATH` + `SITE_ORIGIN` (fallback alias
  `NEXT_PUBLIC_SITE_ORIGIN`; default = Pages origin) it derives the
  client values and injects them via the Next `env` config, so
  `NEXT_PUBLIC_SITE_BASE`/`NEXT_PUBLIC_SITE_ORIGIN` can never drift
  from the router again. `NEXT_PUBLIC_SITE_BASE` remains available
  as an explicit override.
- `src/lib/types.ts`: trailing-slash normalisation + comments
  pointing at the config as the source (literals kept only as a
  last-resort fallback for tooling that bypasses next.config).
- `scripts/fetch-data.mjs`: if both the live fetch and the app
  dataset are unavailable, the build keeps the committed
  `src/data/spots.json` instead of failing (articles already behaved
  this way).
- `vercel.json` (new): `framework: nextjs`,
  `buildCommand: npm run build`, `outputDirectory: out` — matches
  `output: 'export'`, so a Vercel import needs zero guesswork.

**Env matrix:**

| | GitHub Pages (today) | Vercel |
|---|---|---|
| `SITE_BASE_PATH` | `/mecauca-web` | unset (root) |
| `SITE_ORIGIN` | unset (defaults to the Pages origin) | `https://<project>.vercel.app` (optional; sitemap/robots/metadata base only) |
| Required env | `SITE_BASE_PATH` only | none |

**Verification — three production builds (2026-11-10):**
1. *Vercel flavour* (`SITE_BASE_PATH`/`NEXT_PUBLIC_*` unset,
   `SITE_ORIGIN=https://mecauca-web.vercel.app` as a stand-in name):
   148 HTML files, sitemap 141 URLs all on the env origin, robots
   pointing at the env origin, **0** `/mecauca-web` path prefixes in
   exported HTML and JS bundles, **0** `quangnm2293.github.io`
   references in HTML/sitemap/robots, asset URLs root-relative
   (`/_next/…`).
2. *Status-quo Pages build* (documented env: `SITE_BASE_PATH` +
   both `NEXT_PUBLIC_*`): output shape identical to the pre-change
   baseline — 148 HTML, 141 sitemap URLs on the Pages origin,
   `/mecauca-web/` asset prefixes present. Pages flavour untouched.
3. *Pages, single knob* (`SITE_BASE_PATH=/mecauca-web` only): same
   Pages output as (2), including the Pages-origin sitemap and the
   inlined base in the client bundle (`location.origin + base +
   "/tai-khoan/"`) — the unification works.

**Post-import checklist (for when the owner imports):**
1. Import `quangnm2293/mecauca-web`; Root Directory `./`; the
   project name chosen at import becomes the `*.vercel.app`
   subdomain (see README for the full click-path).
2. Add `https://<name>.vercel.app/**` to Supabase → Authentication
   → URL Configuration → Redirect URLs.
3. Smoke-test Google sign-in on the Vercel origin.
4. Decide the fate of the GitHub Pages staging afterwards (it keeps
   working unchanged until then).

## Full-card click (2026-11-01, after owner's card-tap report)

Owner: "Click card k mở ra bãi câu đc phải click vào text, rà soát
lại nhiều chỗ như vậy rồi" — on spot cards only the title text was a
link; tapping the rest of the card did nothing. Whole site audited
for the same pattern.

**Technique:** one shared stretched-link pattern in `globals.css` —
the card/row gets `.has-stretch` (position: relative) and its single
primary link gets `.stretched-link` (an `::after` layer, inset 0,
covers the whole card). Whole card gets `cursor: pointer` + a deeper
hover shadow; the link's `:focus-visible` outline is drawn on the
`::after` so keyboard focus rings the whole card. Independent
in-card actions stay above the layer: for the ⚑ Báo cáo button only
the `<button class="flag-btn">` itself is raised
(`.has-stretch .flag-btn { position: relative; z-index: 2 }`) — NOT
its wrapper, because the flag dialog is the button's sibling and
must keep its global z-index over the sticky header. No `<a>` in
`<a>` anywhere; cards with no destination were left non-clickable.

**Inventory:**
- FIXED (title/text-only link → whole surface):
  - `SpotCard` — home featured, /bai-cau grid, spot-detail
    "Bãi câu khác ở {tỉnh}" related spots.
  - Article cards (home highlights, /cam-nang search list,
    article-page "Đọc tiếp") — deduplicated into a new shared
    `components/ArticleCard.tsx`.
  - `ReportCard` (home latest, /bao-ca feed) — whole card → the
    report's spot page via the existing spot-name link, stretched;
    ⚑ Báo cáo stays independent (verified). Per-spot report lists
    (`showSpot=false`) have no destination → unchanged.
  - "Đóng góp của tôi" spot rows — the name is now the stretched
    link when the spot is approved (was a small "Xem trang bãi →"
    text link, now removed in favour of the row link).
  - "Báo cá của tôi" + "Đóng góp của tôi" suggestion rows — had NO
    link at all; the title now stretches to the row's spot page when
    the spot resolves in the static directory (serverId → slug map
    in `MyContent.tsx`); unresolvable rows stay unlinked.
  - /tai-khoan "Nội dung của tôi" link-list rows — link stretched
    over the whole row (rows also gained padding + hover background
    so they read as tappable rows).
- AUDITED, ALREADY FINE (no change): home kind-shortcut pills (the
  Link IS the pill), SpotPicker rows and calendar day cells
  (whole-row/cell `<button>`s), map popup links, header/footer/prose
  links.
- AUDITED, CORRECTLY NON-CLICKABLE (no change): journal entries
  (no destination exists — spot is free text; the 🗑 button is the
  only action), moderation queue cards (action cards; no target
  link exists — Duyệt/Từ chối/Áp dụng buttons are the interaction).

**Verification:** headless Chrome (puppeteer-core) against the exact
exported build, 10/10 behavioural assertions — clicks on card
PADDING/edges and on non-link children (species chip, excerpt
paragraph, report-card edge, my-row status chip, link-list
description span) navigate to the right URL; a click on ⚑ Báo cáo
inside a report card does NOT navigate to the spot (it kicks off
Google sign-in — the intercepted OAuth attempt proves the button
received the click). Report data in the test was the backend's real
payload replayed through request interception, because Chrome on
this VM cannot traverse the credentialled egress proxy; a live
in-browser click test is therefore not possible from here. The
deployed tree is byte-identical to the tested build, and live
checks confirm the new CSS (`a89ff3dab623cabe.css`) is served, the
live home HTML contains the stretched-link markup, and all audited
routes return 200.
**Deploy:** source `7c3f538` (main), gh-pages `d3b3929`.

## Responsive pass (2026-11-01, after owner's "Chưa responsive" report)

Method: headless-Chromium renders of the built export at 320/360/390/
768/1280px across 11 routes (home, directory list + map, spot detail,
handbook, reports, post-report, contribute, journal, account,
moderation), with programmatic overflow measurement
(`documentElement.scrollWidth` vs `innerWidth`, widest-element scans,
and a live-override bisection to find the forcing element).

Defects found (before):
- **Header broken at every width ≤ ~900px.** The bar was a single
  nowrap flex row locked to `height: 60px`; measured logo height
  88px and CTA height 81px at 360px — links wrapped mid-word
  ("Bãi/câu"), the logo stacked into 3 lines and was clipped, and
  the "Đăng báo cá" pill ballooned into a blob spilling below the
  bar. At 768px all 7 items re-appeared and wrapped the same way.
  At 320px the header forced `scrollWidth` 343 (real overflow).
- **Spot pages forced a 375px minimum layout width** (on a 360px
  phone the layout viewport silently expanded → page rendered
  zoomed-out). Bisected to `.cal-grid`: `repeat(7, 1fr)` tracks are
  `minmax(auto, 1fr)`, so the badge min-content (`.cal-badge`
  min-width 30px + cell padding) set a ~375px floor.
- **Hero search overflowed at 320px**: the input's intrinsic
  min-width pushed the "Tìm bãi" button to x=334 (button also
  wrapped to two lines at 360px).
- Latent risks fixed in the same pass: `.grid-2`/`.grid-3`/
  `.filters`/`.footer-grid` minmax floors (300/250/180/220px) could
  exceed sub-360px containers; the forecast text block's inline
  `minWidth: 220`; `.comp-table`'s nowrap value cell
  ("Chưa có dữ liệu"); 15px form inputs (iOS focus auto-zoom);
  sub-40px tap targets (`.chip-btn`, `.icon-btn`, `.cal-nav` 36px).

Fixes (all in `src/app/globals.css` + one inline style in
`SpotForecast.tsx`):
- Header: `min-height: 60px` instead of fixed height, logo
  `nowrap`. At ≤900px the header wraps: `.main-nav` becomes
  `display: contents` and items are ordered — logo, CTA
  (margin-left auto) and account on row 1; text links flow onto
  their own row below; every link `nowrap`. Desktop ≥901px is
  pixel-identical to before (header height 61px incl. border,
  verified at 1280px).
- `.cal-grid` → `repeat(7, minmax(0, 1fr))`, `.cal-cell`
  `min-width: 0`; at ≤480px cells/badges shrink (badge 11px,
  min-width 24px) — solid-vs-outline keeps Dự báo vs Ước tính
  distinguishable.
- Hero search: input `min-width: 0`, button `nowrap; flex: none`.
- Grid floors → `minmax(min(Npx, 100%), 1fr)`; forecast text block
  → `flex: 1 1 200px; minWidth: 0`; comp-table value cells may
  wrap ≤640px; form inputs 16px ≤640px; tap targets ≥40px
  (`.cal-nav` now 40px globally); tighter panel/card padding
  ≤480px; `overflow-x: clip` on body as a last-resort net only
  (sticky header re-verified working after scroll).

Verification (after): every audited route at 360/390/768 has
`scrollWidth == innerWidth`, zero offending elements (the only
rects outside the viewport are Leaflet tile <img>s inside their
clipped pane — normal, pre-existing); home + spot also clean at
320px; spot-page layout viewport no longer expands at 360px;
screenshots confirm the two-row mobile header, one-line logo and
pill CTA, full 7-column calendar, and unchanged desktop layout.
**Deploy:** source commit `0b58849` (main), gh-pages `cf0e5ca`;
live home now references CSS `176cb8ca998924b9.css` (was
`8ffd29eae3cc5643.css`); all audited routes curl-verified 200.

## V1 history (2026-11-01, earlier the same day)

- Repo https://github.com/quangnm2293/mecauca-web (public): `main` =
  Next.js source; `gh-pages` = static export on GitHub Pages.
- Next.js 15 (App Router, TypeScript), `output: 'export'`, plain CSS
  (app design tokens: emerald `#0B6E4F`, amber `#F59E0B`, kind hues);
  `trailingSlash: true`; `basePath`/`assetPrefix` from `SITE_BASE_PATH`.
- 144 routes: home, /bai-cau, /bao-ca, /cam-nang, /gioi-thieu, 111 spot
  pages (110 seeds + 1 community-approved, fetched live at build),
  23 article pages, sitemap (139 URLs), robots.txt.
- Forecast engine + astronomy + score formula v2 ported to TS
  (`src/lib/astro.ts`, `score.ts`, `forecast.ts`); Trị An smoke test
  scored 77 with all four components; brand rule (no source names in
  rendered copy) verified 0 hits — still held in V2.

## Deliberately later

- Custom domain (user chose free GitHub Pages staging first,
  2026-11-01). Move = DNS + rebuild with empty `SITE_BASE_PATH` +
  `SITE_ORIGIN`, **plus** adding `https://<domain>/**`
  to the Supabase redirect URLs — see README. A Vercel
  `*.vercel.app` deployment is being prepared instead (2026-11-10,
  see "Vercel readiness" above).
- Scheduled rebuilds (GitHub Actions cron) so newly approved spots
  get static pages without a manual build; runtime surfaces
  (feed, pickers, moderation) are already live.
- Dark-mode toggle (website is light-theme only).
- Journal/report photos (needs a storage decision; the app doesn't
  have them either yet).
