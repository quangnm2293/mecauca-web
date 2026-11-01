/**
 * Community backend client (browser) — full read/write port of the
 * app's backend layer. Same project, same RLS rules: anon reads
 * approved content; signed-in users write their own rows as
 * 'pending'; moderators (rows in `moderators`) read everything and
 * flip statuses. All payloads mirror the app's row_mapping exactly.
 */
import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import { SITE_BASE } from './types';

export const SB_URL = 'https://xojsdaunyknwbemijbhb.supabase.co';
export const SB_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanNkYXVueWtud2JlbWlqYmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMzIzNzAsImV4cCI6MjEwODgwODM3MH0.44MMhPL74b7r2rEdpZdlLExTxwpwbVVDZW5uiE0PM7w';

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(SB_URL, SB_ANON, {
      auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true },
    });
  }
  return client;
}

/** Where Google sign-in should land back on this site. */
export function accountRedirectUrl(): string {
  if (typeof window === 'undefined') return '/tai-khoan/';
  return `${window.location.origin}${SITE_BASE}/tai-khoan/`;
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: accountRedirectUrl() },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase().auth.signOut();
}

// ---------------------------------------------------------------- types

export interface Profile {
  id: string;
  displayName: string;
  avatarColor: number;
}

export interface MySpotRow {
  serverId: string;
  clientId: string | null;
  name: string;
  province: string;
  region: string;
  lat: number;
  lng: number;
  kind: string;
  species: string[];
  ticketNote: string | null;
  facilities: string[];
  description: string;
  status: string;
  createdAt: string | null;
}

export interface MyReportRow {
  serverId: string;
  clientId: string | null;
  spotServerId: string;
  species: string;
  weightKg: number | null;
  bait: string;
  note: string;
  authorName: string;
  caughtOn: string;
  status: string;
  createdAt: string | null;
}

export interface MySuggestionRow {
  serverId: string;
  clientId: string | null;
  spotServerId: string;
  field: string;
  correctedText: string;
  note: string;
  status: string;
  createdAt: string | null;
}

type Row = Record<string, unknown>;
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const numOrNull = (v: unknown) => (typeof v === 'number' ? v : null);
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((e) => String(e)) : [];

export function spotFromRow(r: Row): MySpotRow {
  return {
    serverId: str(r.id),
    clientId: typeof r.client_id === 'string' ? r.client_id : null,
    name: str(r.name),
    province: str(r.province),
    region: str(r.region, 'Bắc'),
    lat: typeof r.lat === 'number' ? r.lat : 0,
    lng: typeof r.lng === 'number' ? r.lng : 0,
    kind: str(r.kind, 'hoTuNhien'),
    species: strList(r.species),
    ticketNote: typeof r.ticket_note === 'string' ? r.ticket_note : null,
    facilities: strList(r.facilities),
    description: str(r.description),
    status: str(r.status, 'pending'),
    createdAt: typeof r.created_at === 'string' ? r.created_at : null,
  };
}

export function reportFromRow(r: Row): MyReportRow {
  return {
    serverId: str(r.id),
    clientId: typeof r.client_id === 'string' ? r.client_id : null,
    spotServerId: str(r.spot_id),
    species: str(r.species),
    weightKg: numOrNull(r.weight_kg),
    bait: str(r.bait),
    note: str(r.note),
    authorName: str(r.author_name, 'Cần thủ'),
    caughtOn: str(r.caught_on),
    status: str(r.status, 'pending'),
    createdAt: typeof r.created_at === 'string' ? r.created_at : null,
  };
}

export function suggestionFromRow(r: Row): MySuggestionRow {
  return {
    serverId: str(r.id),
    clientId: typeof r.client_id === 'string' ? r.client_id : null,
    spotServerId: str(r.spot_id),
    field: str(r.field),
    correctedText: str(r.corrected_text),
    note: str(r.note),
    status: str(r.status, 'pending'),
    createdAt: typeof r.created_at === 'string' ? r.created_at : null,
  };
}

// ---------------------------------------------------------------- profile

export function googleName(user: User): string {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return str(meta.full_name) || str(meta.name) || '';
}

export function googleAvatar(user: User): string | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return typeof meta.avatar_url === 'string' ? meta.avatar_url : null;
}

/** Fetch the user's profile row; create it on first sign-in (Google
 *  name as default), mirroring the app. */
export async function ensureProfile(user: User): Promise<Profile | null> {
  const sb = supabase();
  const { data } = await sb.from('profiles').select().eq('id', user.id).maybeSingle();
  if (data) {
    return {
      id: str(data.id),
      displayName: str(data.display_name, 'Cần thủ'),
      avatarColor: typeof data.avatar_color === 'number' ? data.avatar_color : 0,
    };
  }
  const displayName = googleName(user) || 'Cần thủ';
  const { error } = await sb.from('profiles').insert({
    id: user.id,
    display_name: displayName,
    avatar_color: 0,
  });
  if (error) return null;
  return { id: user.id, displayName, avatarColor: 0 };
}

export async function updateProfile(p: Profile): Promise<boolean> {
  const { error } = await supabase()
    .from('profiles')
    .update({
      display_name: p.displayName,
      avatar_color: p.avatarColor,
      updated_at: new Date().toISOString(),
    })
    .eq('id', p.id);
  return !error;
}

// ---------------------------------------------------------------- moderator

/** Membership test — identical to the app: own row in `moderators`. */
export async function checkIsModerator(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase()
      .from('moderators')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- my content

export async function fetchMySpots(userId: string): Promise<MySpotRow[]> {
  const { data, error } = await supabase()
    .from('spots')
    .select()
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as Row[]).map(spotFromRow);
}

export async function fetchMyReports(userId: string): Promise<MyReportRow[]> {
  const { data, error } = await supabase()
    .from('catch_reports')
    .select()
    .eq('created_by', userId)
    .order('caught_on', { ascending: false });
  if (error || !data) return [];
  return (data as Row[]).map(reportFromRow);
}

export async function fetchMySuggestions(userId: string): Promise<MySuggestionRow[]> {
  const { data, error } = await supabase()
    .from('spot_suggestions')
    .select()
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as Row[]).map(suggestionFromRow);
}

/** Approved spots (for pickers) — id/name/province/kind for every row. */
export interface PickerSpot {
  serverId: string;
  slug: string | null;
  name: string;
  province: string;
  kind: string;
  status: string;
}

export async function fetchApprovedSpotsForPicker(): Promise<PickerSpot[]> {
  const { data, error } = await supabase()
    .from('spots')
    .select('id,client_id,name,province,kind,status')
    .eq('status', 'approved')
    .order('name')
    .limit(1000);
  if (error || !data) return [];
  return (data as Row[]).map((r) => ({
    serverId: str(r.id),
    slug: typeof r.client_id === 'string' ? r.client_id : null,
    name: str(r.name),
    province: str(r.province),
    kind: str(r.kind, 'hoTuNhien'),
    status: str(r.status),
  }));
}

/** Spot display names keyed by server uuid AND client_id, for
 *  joining my rows (RLS with my token: approved + my own spots). */
export async function fetchSpotNameMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data } = await supabase().from('spots').select('id, client_id, name').limit(2000);
  for (const r of (data ?? []) as Row[]) {
    map.set(str(r.id), str(r.name));
    if (typeof r.client_id === 'string') map.set(r.client_id, str(r.name));
  }
  return map;
}

// ---------------------------------------------------------------- writes
// Payloads mirror the app's row_mapping write payloads exactly:
// inserts are forced to status='pending' + created_by = me by RLS.

export interface NewReport {
  clientId: string;
  spotServerId: string;
  species: string;
  weightKg: number | null;
  bait: string;
  note: string;
  authorName: string;
  caughtOn: string; // yyyy-mm-dd
}

export async function insertReport(userId: string, r: NewReport): Promise<boolean> {
  const { error } = await supabase().from('catch_reports').insert({
    client_id: r.clientId,
    spot_id: r.spotServerId,
    species: r.species,
    weight_kg: r.weightKg,
    bait: r.bait,
    note: r.note,
    author_name: r.authorName.trim() || 'Cần thủ',
    caught_on: r.caughtOn,
    status: 'pending',
    created_by: userId,
  });
  return !error;
}

export interface NewSpot {
  clientId: string;
  name: string;
  province: string;
  region: string;
  lat: number;
  lng: number;
  kind: string;
  species: string[];
  ticketNote: string | null;
  facilities: string[];
  description: string;
}

export async function insertSpot(userId: string, s: NewSpot): Promise<boolean> {
  const { error } = await supabase().from('spots').insert({
    client_id: s.clientId,
    name: s.name,
    province: s.province,
    region: s.region,
    lat: s.lat,
    lng: s.lng,
    kind: s.kind,
    species: s.species,
    ticket_note: s.ticketNote,
    facilities: s.facilities,
    description: s.description,
    source: 'community',
    status: 'pending',
    created_by: userId,
  });
  return !error;
}

export async function insertSuggestion(
  userId: string,
  s: { clientId: string; spotServerId: string; field: string; correctedText: string; note: string },
): Promise<boolean> {
  const { error } = await supabase().from('spot_suggestions').insert({
    client_id: s.clientId,
    spot_id: s.spotServerId,
    field: s.field,
    corrected_text: s.correctedText,
    note: s.note,
    status: 'pending',
    created_by: userId,
  });
  return !error;
}

/** UGC moderation report ("Báo cáo nội dung"). */
export async function insertModerationReport(
  userId: string,
  r: { clientId: string; targetType: string; targetId: string; reason: string },
): Promise<boolean> {
  const { error } = await supabase().from('reports_moderation').insert({
    client_id: r.clientId,
    target_type: r.targetType,
    target_id: r.targetId,
    reason: r.reason,
    created_by: userId,
  });
  return !error;
}

// ---------------------------------------------------------------- moderation queue

export interface ModSpotItem extends MySpotRow {
  createdBy: string | null;
}
export interface ModReportItem extends MyReportRow {
  createdBy: string | null;
}
export interface ModSuggestionItem extends MySuggestionRow {
  createdBy: string | null;
}
export interface ModReportFlag {
  serverId: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdBy: string | null;
  createdAt: string | null;
}

export interface ModerationQueue {
  pendingSpots: ModSpotItem[];
  pendingReports: ModReportItem[];
  pendingSuggestions: ModSuggestionItem[];
  openFlags: ModReportFlag[];
  authorNames: Map<string, string>;
  /** Full spot records for suggestion targets / report spots, by server id. */
  spotsByServerId: Map<string, MySpotRow>;
  /** Human labels for UGC-report targets, keyed by uuid AND client_id. */
  targetLabels: Map<string, string>;
  /** Spot display names keyed by uuid AND client_id. */
  spotNames: Map<string, string>;
}

/** Faithful port of the app's fetchModerationQueue. */
export async function fetchModerationQueue(): Promise<ModerationQueue | null> {
  const sb = supabase();
  try {
    const spotIndex = await sb.from('spots').select('id, client_id, name');
    if (spotIndex.error) return null;
    const nameByAnyId = new Map<string, string>();
    const clientByServer = new Map<string, string>();
    for (const r of (spotIndex.data ?? []) as Row[]) {
      const id = str(r.id);
      const name = str(r.name);
      nameByAnyId.set(id, name);
      if (typeof r.client_id === 'string') {
        clientByServer.set(id, r.client_id);
        nameByAnyId.set(r.client_id, name);
      }
    }

    const [spotsRes, reportsRes, suggRes, flagsRes] = await Promise.all([
      sb.from('spots').select().eq('status', 'pending').order('created_at'),
      sb.from('catch_reports').select().eq('status', 'pending').order('created_at'),
      sb.from('spot_suggestions').select().eq('status', 'pending').order('created_at'),
      sb.from('reports_moderation').select().eq('status', 'open').order('created_at'),
    ]);
    if (spotsRes.error || reportsRes.error || suggRes.error || flagsRes.error) return null;

    const pendingSpots: ModSpotItem[] = ((spotsRes.data ?? []) as Row[]).map((r) => ({
      ...spotFromRow(r),
      createdBy: typeof r.created_by === 'string' ? r.created_by : null,
    }));
    const pendingReports: ModReportItem[] = ((reportsRes.data ?? []) as Row[]).map((r) => ({
      ...reportFromRow(r),
      createdBy: typeof r.created_by === 'string' ? r.created_by : null,
    }));
    const pendingSuggestions: ModSuggestionItem[] = ((suggRes.data ?? []) as Row[]).map((r) => ({
      ...suggestionFromRow(r),
      createdBy: typeof r.created_by === 'string' ? r.created_by : null,
    }));
    const openFlags: ModReportFlag[] = ((flagsRes.data ?? []) as Row[]).map((r) => ({
      serverId: str(r.id),
      targetType: str(r.target_type),
      targetId: str(r.target_id),
      reason: str(r.reason),
      status: str(r.status, 'open'),
      createdBy: typeof r.created_by === 'string' ? r.created_by : null,
      createdAt: typeof r.created_at === 'string' ? r.created_at : null,
    }));

    // Full spot records for the spots the queue items point at.
    const fetchIds = new Set<string>();
    for (const s of pendingSuggestions) fetchIds.add(s.spotServerId);
    for (const r of pendingReports) fetchIds.add(r.spotServerId);
    const spotsByServerId = new Map<string, MySpotRow>();
    if (fetchIds.size > 0) {
      const { data } = await sb.from('spots').select().in('id', [...fetchIds]);
      for (const r of (data ?? []) as Row[]) {
        const spot = spotFromRow(r);
        spotsByServerId.set(spot.serverId, spot);
      }
    }

    // Human labels for UGC-report targets.
    const targetLabels = new Map<string, string>();
    if (openFlags.length > 0) {
      const spotNameOf = (sid: unknown) =>
        typeof sid === 'string' ? (nameByAnyId.get(sid) ?? '') : '';
      const [repIdx, sugIdx] = await Promise.all([
        sb.from('catch_reports').select('id, client_id, species, spot_id'),
        sb.from('spot_suggestions').select('id, client_id, field, spot_id'),
      ]);
      for (const r of (repIdx.data ?? []) as Row[]) {
        const label = `Báo cá: ${str(r.species)} — ${spotNameOf(r.spot_id)}`;
        targetLabels.set(str(r.id), label);
        if (typeof r.client_id === 'string') targetLabels.set(r.client_id, label);
      }
      for (const r of (sugIdx.data ?? []) as Row[]) {
        const label = `Gợi ý sửa (${str(r.field)}) — ${spotNameOf(r.spot_id)}`;
        targetLabels.set(str(r.id), label);
        if (typeof r.client_id === 'string') targetLabels.set(r.client_id, label);
      }
      for (const [k, v] of nameByAnyId) targetLabels.set(k, `Bãi câu: ${v}`);
    }

    // Author display names (profiles are public-read).
    const authorIds = new Set<string>();
    for (const items of [pendingSpots, pendingReports, pendingSuggestions, openFlags]) {
      for (const it of items) if (it.createdBy) authorIds.add(it.createdBy);
    }
    const authorNames = new Map<string, string>();
    if (authorIds.size > 0) {
      const { data } = await sb
        .from('profiles')
        .select('id, display_name')
        .in('id', [...authorIds]);
      for (const r of (data ?? []) as Row[]) {
        authorNames.set(str(r.id), str(r.display_name, 'Cần thủ'));
      }
    }

    return {
      pendingSpots,
      pendingReports,
      pendingSuggestions,
      openFlags,
      authorNames,
      spotsByServerId,
      targetLabels,
      spotNames: nameByAnyId,
    };
  } catch {
    return null;
  }
}

export async function updateRowStatus(
  table: 'spots' | 'catch_reports' | 'spot_suggestions' | 'reports_moderation',
  serverId: string,
  status: string,
): Promise<boolean> {
  const { error } = await supabase().from(table).update({ status }).eq('id', serverId);
  return !error;
}

/** Apply a suggestion: patch the spot (when the patch is non-empty),
 *  then mark the suggestion 'applied' — the app's exact semantics. */
export async function applySuggestion(
  suggestionServerId: string,
  spotServerId: string,
  spotPatch: Record<string, unknown>,
): Promise<boolean> {
  const sb = supabase();
  if (Object.keys(spotPatch).length > 0) {
    const { error } = await sb
      .from('spots')
      .update({ ...spotPatch, updated_at: new Date().toISOString() })
      .eq('id', spotServerId);
    if (error) return false;
  }
  const { error } = await sb
    .from('spot_suggestions')
    .update({ status: 'applied' })
    .eq('id', suggestionServerId);
  return !error;
}

export type { Session, User };
