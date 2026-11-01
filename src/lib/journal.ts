/**
 * Fishing-trip journal — LOCAL ONLY, exactly like the app: entries
 * live in this browser's localStorage under one JSON payload and
 * never leave the device. A trip with no species and no weight
 * counts as "móm" (blank).
 */

export interface JournalEntry {
  id: string;
  date: string; // ISO datetime
  spot: string;
  species: string;
  weightKg: number | null;
  bait: string;
  note: string;
}

const KEY = 'mecauca-nhat-ky';

export function entryHasCatch(e: JournalEntry): boolean {
  return e.species.trim() !== '' || (e.weightKg ?? 0) > 0;
}

export function loadJournal(): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as JournalEntry[];
    if (!Array.isArray(list)) throw new Error('not a list');
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    // Corrupt payload: keep it aside and start clean (app behaviour).
    try {
      window.localStorage.setItem(`${KEY}-corrupt`, raw);
    } catch {
      /* ignore */
    }
    return [];
  }
}

function saveAll(entries: JournalEntry[]): JournalEntry[] {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  window.localStorage.setItem(KEY, JSON.stringify(sorted));
  return sorted;
}

export function addJournalEntry(e: JournalEntry): JournalEntry[] {
  return saveAll([...loadJournal(), e]);
}

export function removeJournalEntry(id: string): JournalEntry[] {
  return saveAll(loadJournal().filter((e) => e.id !== id));
}

export interface JournalStats {
  trips: number;
  withCatch: number;
  blank: number;
  blankRatio: number; // 0..1, 0 when no trips
}

export function journalStats(entries: JournalEntry[]): JournalStats {
  const withCatch = entries.filter(entryHasCatch).length;
  const blank = entries.length - withCatch;
  return {
    trips: entries.length,
    withCatch,
    blank,
    blankRatio: entries.length === 0 ? 0 : blank / entries.length,
  };
}
