/**
 * Mapping a spot-correction suggestion onto the columns of its
 * target spots row (the moderator "Áp dụng" action) — a faithful
 * port of the app's suggestion_patch.dart, including its failure
 * semantics: unparseable / out-of-bounds coordinates produce an
 * error and NOTHING is written (the suggestion stays pending).
 */
import type { MySpotRow } from './supabase';

export interface SuggestionPatch {
  spotColumns: Record<string, unknown>;
  error?: string;
}

/** Split list text (Loài cá / Tiện ích) on commas and newlines. */
export function splitSuggestionList(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

/** Parse a "lat, lng" pair — accepts "11.1006, 107.0447",
 *  "11.1006 107.0447" and the Vietnamese decimal-comma form
 *  "11,1006, 107,0447". Null when not exactly one pair of numbers. */
export function parseSuggestionCoords(text: string): { lat: number; lng: number } | null {
  const t = text.trim();
  const parse = (s: string) => {
    const n = Number(s);
    return s !== '' && Number.isFinite(n) ? n : null;
  };
  const commaParts = t
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
  if (commaParts.length === 4 && commaParts.every((p) => parse(p) != null)) {
    return {
      lat: Number(`${commaParts[0]}.${commaParts[1]}`),
      lng: Number(`${commaParts[2]}.${commaParts[3]}`),
    };
  }
  const parts = t.split(/[,;\s]+/).filter((e) => e.length > 0);
  if (parts.length !== 2) return null;
  const lat = parse(parts[0]);
  const lng = parse(parts[1]);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

/** Vietnam waters bounding box (the spots table's check limits). */
export function coordsInVietnam(lat: number, lng: number): boolean {
  return lat >= 8.0 && lat <= 23.6 && lng >= 102.0 && lng <= 110.0;
}

/** Map field + moderator-confirmed text to a spots patch. */
export function suggestionSpotPatch(field: string, text: string): SuggestionPatch {
  const t = text.trim();
  switch (field) {
    case 'Tên bãi':
      return t === ''
        ? { spotColumns: {}, error: 'Tên bãi mới đang trống.' }
        : { spotColumns: { name: t } };
    case 'Giá vé':
      // Empty means "free / no ticket info" — write null.
      return { spotColumns: { ticket_note: t === '' ? null : t } };
    case 'Mô tả':
      return { spotColumns: { description: t } };
    case 'Loài cá':
      return { spotColumns: { species: splitSuggestionList(t) } };
    case 'Tiện ích':
      return { spotColumns: { facilities: splitSuggestionList(t) } };
    case 'Vị trí / toạ độ': {
      const coords = parseSuggestionCoords(t);
      if (!coords) {
        return {
          spotColumns: {},
          error:
            'Không đọc được toạ độ — cần dạng "vĩ độ, kinh độ", ví dụ 11.1006, 107.0447. Gợi ý vẫn chờ duyệt, chưa áp dụng.',
        };
      }
      if (!coordsInVietnam(coords.lat, coords.lng)) {
        return {
          spotColumns: {},
          error:
            'Toạ độ nằm ngoài vùng biển/nước Việt Nam — kiểm tra lại. Gợi ý vẫn chờ duyệt, chưa áp dụng.',
        };
      }
      return { spotColumns: { lat: coords.lat, lng: coords.lng } };
    }
    default:
      // 'Khác': nothing is auto-written; applying only marks handled.
      return { spotColumns: {} };
  }
}

/** The target spot's CURRENT value for a field (apply-sheet compare). */
export function suggestionCurrentValue(field: string, spot: MySpotRow): string {
  switch (field) {
    case 'Tên bãi':
      return spot.name;
    case 'Giá vé':
      return spot.ticketNote ?? '(chưa cập nhật)';
    case 'Mô tả':
      return spot.description === '' ? '(trống)' : spot.description;
    case 'Loài cá':
      return spot.species.length === 0 ? '(chưa có)' : spot.species.join(', ');
    case 'Tiện ích':
      return spot.facilities.length === 0 ? '(chưa có)' : spot.facilities.join(', ');
    case 'Vị trí / toạ độ':
      return `${spot.lat.toFixed(5)}, ${spot.lng.toFixed(5)}`;
    default:
      return '(không tự ghi vào bãi)';
  }
}
