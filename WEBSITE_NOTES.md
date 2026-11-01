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
