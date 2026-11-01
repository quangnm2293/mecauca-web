# WEBSITE_NOTES — Mê Câu Cá website

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
  `NEXT_PUBLIC_SITE_ORIGIN`, **plus** adding `https://<domain>/**`
  to the Supabase redirect URLs — see README.
- Scheduled rebuilds (GitHub Actions cron) so newly approved spots
  get static pages without a manual build; runtime surfaces
  (feed, pickers, moderation) are already live.
- Dark-mode toggle (website is light-theme only).
- Journal/report photos (needs a storage decision; the app doesn't
  have them either yet).
