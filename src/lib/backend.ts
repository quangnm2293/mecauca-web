/**
 * Read-only client for the community backend (browser-side).
 * Only APPROVED content is ever requested: spots for the id map and
 * catch reports for the community feed. Failures resolve to empty
 * lists so sections can show their honest empty states.
 */
import type { CatchReport } from './types';

const SB_URL = 'https://xojsdaunyknwbemijbhb.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanNkYXVueWtud2JlbWlqYmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMzIzNzAsImV4cCI6MjEwODgwODM3MH0.44MMhPL74b7r2rEdpZdlLExTxwpwbVVDZW5uiE0PM7w';

const headers = { apikey: ANON, Authorization: `Bearer ${ANON}` };

interface SpotIdRow {
  id: string;
  client_id: string | null;
  name: string;
  province: string;
}

let spotMapPromise: Promise<Map<string, SpotIdRow>> | null = null;

/** server uuid -> spot row (for joining catch reports to spot pages). */
export function fetchSpotMap(): Promise<Map<string, SpotIdRow>> {
  if (!spotMapPromise) {
    spotMapPromise = (async () => {
      const map = new Map<string, SpotIdRow>();
      try {
        const res = await fetch(
          `${SB_URL}/rest/v1/spots?select=id,client_id,name,province&status=eq.approved&limit=1000`,
          { headers },
        );
        if (!res.ok) return map;
        const rows = (await res.json()) as SpotIdRow[];
        for (const r of rows) map.set(r.id, r);
      } catch {
        /* keep empty map */
      }
      return map;
    })();
  }
  return spotMapPromise;
}

interface ReportRow {
  id: string;
  spot_id: string;
  species: string;
  weight_kg: number | null;
  bait: string | null;
  note: string | null;
  author_name: string | null;
  caught_on: string;
  created_at: string | null;
}

function toReport(row: ReportRow, spot?: SpotIdRow): CatchReport {
  return {
    id: row.id,
    spotSlug: spot?.client_id ?? null,
    spotName: spot?.name ?? null,
    species: row.species ?? '',
    weightKg: row.weight_kg,
    bait: row.bait ?? '',
    note: row.note ?? '',
    authorName: row.author_name ?? 'Cần thủ',
    caughtOn: row.caught_on,
    createdAt: row.created_at,
  };
}

/** Latest approved catch reports across all spots. */
export async function fetchLatestReports(limit = 30): Promise<CatchReport[]> {
  try {
    const [res, spotMap] = await Promise.all([
      fetch(
        `${SB_URL}/rest/v1/catch_reports?select=id,spot_id,species,weight_kg,bait,note,author_name,caught_on,created_at` +
          `&status=eq.approved&order=caught_on.desc,created_at.desc&limit=${limit}`,
        { headers },
      ),
      fetchSpotMap(),
    ]);
    if (!res.ok) return [];
    const rows = (await res.json()) as ReportRow[];
    return rows.map((r) => toReport(r, spotMap.get(r.spot_id)));
  } catch {
    return [];
  }
}

/** Approved catch reports for one spot (by its slug / client_id). */
export async function fetchReportsForSpot(slug: string): Promise<CatchReport[]> {
  try {
    const spotMap = await fetchSpotMap();
    let serverId: string | null = null;
    for (const [uuid, row] of spotMap) {
      if (row.client_id === slug) {
        serverId = uuid;
        break;
      }
    }
    if (!serverId) return [];
    const res = await fetch(
      `${SB_URL}/rest/v1/catch_reports?select=id,spot_id,species,weight_kg,bait,note,author_name,caught_on,created_at` +
        `&status=eq.approved&spot_id=eq.${serverId}&order=caught_on.desc,created_at.desc&limit=50`,
      { headers },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as ReportRow[];
    const spotRow = spotMap.get(serverId);
    return rows.map((r) => toReport(r, spotRow));
  } catch {
    return [];
  }
}
