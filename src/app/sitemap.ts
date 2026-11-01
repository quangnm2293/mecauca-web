import type { MetadataRoute } from 'next';
import { articles, spots } from '@/lib/data';
import { siteUrl } from '@/lib/types';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const core: MetadataRoute.Sitemap = [
    { url: siteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: siteUrl('/bai-cau/'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: siteUrl('/bao-ca/'), lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: siteUrl('/cam-nang/'), lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: siteUrl('/gioi-thieu/'), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: siteUrl('/dang-bao-ca/'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: siteUrl('/dong-gop/'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];
  const spotPages: MetadataRoute.Sitemap = spots.map((s) => ({
    url: siteUrl(`/bai-cau/${s.slug}/`),
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));
  const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
    url: siteUrl(`/cam-nang/${a.slug}/`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));
  return [...core, ...spotPages, ...articlePages];
}
