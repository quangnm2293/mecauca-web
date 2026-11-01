import spotsJson from '@/data/spots.json';
import articlesJson from '@/data/articles.json';
import type { Article, Spot } from './types';

export const spots = spotsJson as Spot[];
export const articles = articlesJson as Article[];

export const spotBySlug = new Map(spots.map((s) => [s.slug, s]));
export const articleBySlug = new Map(articles.map((a) => [a.slug, a]));

export const provinces = [...new Set(spots.map((s) => s.province))].sort((a, b) =>
  a.localeCompare(b, 'vi'),
);

export const regions = ['Bắc', 'Trung', 'Nam'];

export const kinds = [
  { key: 'hoDichVu', label: 'Hồ dịch vụ' },
  { key: 'hoTuNhien', label: 'Hồ tự nhiên' },
  { key: 'hoChua', label: 'Hồ chứa / đập' },
  { key: 'song', label: 'Sông' },
  { key: 'suoi', label: 'Suối / khe' },
].filter((k) => spots.some((s) => s.kind === k.key));

export function spotsInProvince(province: string, exceptSlug?: string): Spot[] {
  return spots.filter((s) => s.province === province && s.slug !== exceptSlug);
}

/** Curated featured spots for the home page (fall back gracefully). */
const FEATURED = ['ho-tri-an', 'ho-thac-ba', 'ho-ban-ve', 'song-vam-nao'];
export const featuredSpots = FEATURED.map((slug) => spotBySlug.get(slug)).filter(
  (s): s is Spot => !!s,
);

/** Plain-text excerpt of an article body for cards/meta. */
export function excerpt(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
