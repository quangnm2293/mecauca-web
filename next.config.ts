import type { NextConfig } from 'next';

// Portable static export: the same build ships to GitHub Pages staging
// (SITE_BASE_PATH=/mecauca-web) today and to a custom domain root ('')
// later with a config change only.
const basePath = process.env.SITE_BASE_PATH ?? '';

const config: NextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default config;
