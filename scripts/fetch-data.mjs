// Build-time data pipeline for Mê Câu Cá website.
// 1) Tries to fetch approved spots from the community backend (public anon read).
// 2) Falls back to parsing the Flutter app's seed dataset (lib/core/spots.dart).
// 3) Copies the handbook articles from the app assets.
// Output: src/data/spots.json + src/data/articles.json
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(root, '..', 'fishing-app');
const SB_URL = 'https://xojsdaunyknwbemijbhb.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanNkYXVueWtud2JlbWlqYmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMzIzNzAsImV4cCI6MjEwODgwODM3MH0.44MMhPL74b7r2rEdpZdlLExTxwpwbVVDZW5uiE0PM7w';

const KIND_LABEL = {
  hoDichVu: 'Hồ dịch vụ',
  hoTuNhien: 'Hồ tự nhiên',
  hoChua: 'Hồ chứa / đập',
  song: 'Sông',
  suoi: 'Suối / khe',
};

async function fetchLive() {
  const url =
    `${SB_URL}/rest/v1/spots?select=id,client_id,name,province,region,lat,lng,kind,` +
    `species,ticket_note,facilities,description&status=eq.approved&order=name.asc&limit=1000`;
  const res = await fetch(url, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length < 50) throw new Error('unexpected row count');
  return rows.map((r) => ({
    slug: r.client_id,
    serverId: r.id,
    name: r.name,
    province: r.province,
    region: r.region,
    lat: r.lat,
    lng: r.lng,
    kind: r.kind,
    kindLabel: KIND_LABEL[r.kind] ?? r.kind,
    species: r.species ?? [],
    ticketNote: r.ticket_note ?? null,
    facilities: r.facilities ?? [],
    description: r.description ?? '',
  }));
}

// --- Fallback: parse the Dart seed list -------------------------------
function parseDart() {
  const src = readFileSync(join(APP, 'lib/core/spots.dart'), 'utf8');
  const start = src.indexOf('const List<FishingSpot> kSeedSpots');
  const body = src.slice(start);
  const entries = [];
  // Split on "  FishingSpot(" at line starts within the seed list.
  const chunks = body.split(/\n\s*FishingSpot\(/).slice(1);
  const str = (chunk, key) => {
    const m = chunk.match(new RegExp(`${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`));
    return m ? m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\') : null;
  };
  const list = (chunk, key) => {
    const m = chunk.match(new RegExp(`${key}:\\s*(?:const\\s*)?\\[([^\\]]*)\\]`));
    if (!m) return [];
    return [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1].replace(/\\'/g, "'"));
  };
  for (const c of chunks) {
    const head = c.slice(0, 2500); // one entry only (fields precede the next entry)
    const id = str(head, 'id');
    if (!id) continue;
    const kindM = head.match(/kind:\s*SpotKind\.(\w+)/);
    const num = (k) => {
      const m = head.match(new RegExp(`${k}:\\s*(-?[\\d.]+)`));
      return m ? parseFloat(m[1]) : 0;
    };
    entries.push({
      slug: id,
      serverId: null,
      name: str(head, 'name'),
      province: str(head, 'province'),
      region: str(head, 'region'),
      lat: num('lat'),
      lng: num('lng'),
      kind: kindM ? kindM[1] : 'hoTuNhien',
      kindLabel: KIND_LABEL[kindM ? kindM[1] : 'hoTuNhien'],
      species: list(head, 'species'),
      ticketNote: str(head, 'ticketNote'),
      facilities: list(head, 'facilities'),
      description: str(head, 'description') ?? '',
    });
    if (entries.length >= 200) break;
  }
  return entries;
}

let spots;
try {
  spots = await fetchLive();
  console.log(`fetch-data: ${spots.length} spots from live backend`);
} catch (e) {
  console.warn(`fetch-data: live fetch failed (${e.message}); parsing app dataset`);
  spots = parseDart();
  console.log(`fetch-data: ${spots.length} spots from app dataset snapshot`);
}
writeFileSync(join(root, 'src/data/spots.json'), JSON.stringify(spots, null, 1));

const articlesSrc = join(APP, 'assets/cam_nang.json');
if (existsSync(articlesSrc)) {
  copyFileSync(articlesSrc, join(root, 'src/data/articles.json'));
  const a = JSON.parse(readFileSync(articlesSrc, 'utf8'));
  console.log(`fetch-data: ${a.length} handbook articles copied`);
}
