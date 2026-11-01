export interface Spot {
  slug: string;
  serverId: string | null;
  name: string;
  province: string;
  region: string; // Bắc | Trung | Nam
  lat: number;
  lng: number;
  kind: string; // hoDichVu | hoTuNhien | hoChua | song | suoi
  kindLabel: string;
  species: string[];
  ticketNote: string | null;
  facilities: string[];
  description: string;
}

export interface Article {
  slug: string;
  title: string;
  body: string;
}

export interface CatchReport {
  id: string;
  spotSlug: string | null;
  spotName: string | null;
  species: string;
  weightKg: number | null;
  bait: string;
  note: string;
  authorName: string;
  caughtOn: string; // yyyy-mm-dd
  createdAt: string | null;
}

/** Kind accent colours — same hues as the app. */
export const KIND_COLORS: Record<string, string> = {
  hoDichVu: '#8B5CF6',
  hoTuNhien: '#16A34A',
  hoChua: '#2563EB',
  song: '#0D9488',
  suoi: '#06B6D4',
};

/** Origin + base path of this website (no trailing slash). */
export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://quangnm2293.github.io';
export const SITE_BASE = process.env.NEXT_PUBLIC_SITE_BASE ?? '/mecauca-web';
export const siteUrl = (path = '/') =>
  `${SITE_ORIGIN}${SITE_BASE}${path.startsWith('/') ? path : `/${path}`}`;
