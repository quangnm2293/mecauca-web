import type { NextConfig } from 'next';

// Portable static export — ONE deploy-time input set drives everything,
// so the public origin/base can never drift between the router, the
// sitemap/canonical/OG URLs and the browser code:
//
//   SITE_BASE_PATH  '' (domain root: Vercel *.vercel.app or a custom
//                   domain) or '/mecauca-web' (GitHub Pages staging)
//   SITE_ORIGIN     public origin for absolute URLs, e.g.
//                   'https://<project>.vercel.app'
//                   (default: the GitHub Pages origin)
//
// The values the browser code needs (NEXT_PUBLIC_SITE_BASE /
// NEXT_PUBLIC_SITE_ORIGIN) are derived here and injected via `env`.
// NEXT_PUBLIC_SITE_BASE may still be set explicitly as an override;
// SITE_ORIGIN falls back to NEXT_PUBLIC_SITE_ORIGIN for compatibility.
const basePath = process.env.SITE_BASE_PATH ?? '';
const siteOrigin = (
  process.env.SITE_ORIGIN ||
  process.env.NEXT_PUBLIC_SITE_ORIGIN ||
  'https://quangnm2293.github.io'
).replace(/\/+$/, '');
const siteBase = (process.env.NEXT_PUBLIC_SITE_BASE || basePath).replace(
  /\/+$/,
  '',
);

const config: NextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_SITE_ORIGIN: siteOrigin,
    NEXT_PUBLIC_SITE_BASE: siteBase,
  },
};

export default config;
