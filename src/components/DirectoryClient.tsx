'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SpotCard from './SpotCard';
import { useAuth } from './AuthProvider';
import { kinds, provinces, regions, spots } from '@/lib/data';
import { KIND_COLORS } from '@/lib/types';
import { matchesQuery } from '@/lib/fold';
import { KIND_LABELS, formatDistanceKm, haversineKm } from '@/lib/constants';
import { fetchMySpots } from '@/lib/supabase';
import type { OwnMapSpot } from './Maps';

const SpotsMap = dynamic(() => import('./Maps').then((m) => m.SpotsMap), {
  ssr: false,
  loading: () => <div className="leaflet-box loading-note">Đang tải bản đồ…</div>,
});

export default function DirectoryClient() {
  const params = useSearchParams();
  const { user } = useAuth();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [kind, setKind] = useState(params.get('loai') ?? '');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [ownSpots, setOwnSpots] = useState<OwnMapSpot[]>([]);

  // My not-yet-public spots ride along on the map (amber), like the app.
  useEffect(() => {
    if (!user) {
      setOwnSpots([]);
      return;
    }
    let alive = true;
    fetchMySpots(user.id).then((mine) => {
      if (!alive) return;
      setOwnSpots(
        mine
          .filter((s) => s.status !== 'approved')
          .map((s) => ({
            name: s.name,
            province: s.province,
            kindLabel: KIND_LABELS[s.kind] ?? s.kind,
            lat: s.lat,
            lng: s.lng,
            status: s.status,
          })),
      );
    });
    return () => {
      alive = false;
    };
  }, [user]);

  const provinceOptions = useMemo(
    () => provinces.filter((p) => !region || spots.some((s) => s.province === p && s.region === region)),
    [region],
  );

  const filtered = useMemo(
    () =>
      spots.filter((s) => {
        if (region && s.region !== region) return false;
        if (province && s.province !== province) return false;
        if (kind && s.kind !== kind) return false;
        if (q.trim()) {
          const hay = `${s.name} ${s.province} ${s.species.join(' ')} ${s.kindLabel}`;
          if (!matchesQuery(hay, q)) return false;
        }
        return true;
      }),
    [q, region, province, kind],
  );

  const distances = useMemo(() => {
    if (!userPos) return null;
    const map = new Map<string, number>();
    for (const s of spots) {
      map.set(s.slug, haversineKm(userPos.lat, userPos.lng, s.lat, s.lng));
    }
    return map;
  }, [userPos]);

  const displayed = useMemo(() => {
    if (!distances) return filtered;
    return [...filtered].sort(
      (a, b) => (distances.get(a.slug) ?? 0) - (distances.get(b.slug) ?? 0),
    );
  }, [filtered, distances]);

  // "Gần bạn": permission is requested ONLY on this tap; the position
  // stays in memory and is never stored or sent anywhere.
  const nearMe = () => {
    if (userPos) {
      setUserPos(null);
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocMsg('Trình duyệt này không hỗ trợ định vị — không xem được bãi gần bạn.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setLocMsg(null);
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setLocMsg(
          'Chưa có quyền vị trí — hãy cho phép trình duyệt truy cập vị trí để xem bãi gần bạn.',
        );
      },
      { timeout: 12000, maximumAge: 300000 },
    );
  };

  return (
    <>
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>
          Tìm kiếm
          <input
            type="search"
            placeholder="Tên bãi, tỉnh hoặc loài cá…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label>
          Miền
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setProvince('');
            }}
          >
            <option value="">Cả nước</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                Miền {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tỉnh / thành phố
          <select value={province} onChange={(e) => setProvince(e.target.value)}>
            <option value="">Tất cả tỉnh</option>
            {provinceOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          Loại bãi
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Tất cả loại bãi</option>
            {kinds.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
      </form>

      <div className="dir-toolbar">
        <div className="chip-row" role="group" aria-label="Chế độ xem">
          <button
            type="button"
            className={`chip-btn${view === 'list' ? ' on' : ''}`}
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
          >
            ☰ Danh sách
          </button>
          <button
            type="button"
            className={`chip-btn${view === 'map' ? ' on' : ''}`}
            onClick={() => setView('map')}
            aria-pressed={view === 'map'}
          >
            🗺️ Bản đồ
          </button>
          <button
            type="button"
            className={`chip-btn${userPos ? ' on' : ''}`}
            onClick={nearMe}
            aria-pressed={!!userPos}
            disabled={locating}
          >
            📍 {locating ? 'Đang định vị…' : userPos ? 'Đang xem gần bạn (bấm để tắt)' : 'Gần bạn'}
          </button>
        </div>
        {userPos && distances && displayed.length > 0 && (
          <span className="loading-note">
            Gần nhất: {displayed[0].name} — cách bạn ~
            {formatDistanceKm(distances.get(displayed[0].slug) ?? 0)}
          </span>
        )}
      </div>

      {locMsg && (
        <p className="loc-msg" role="status">
          {locMsg}{' '}
          <button type="button" className="icon-btn" onClick={() => setLocMsg(null)} aria-label="Đóng thông báo">
            ✕
          </button>
        </p>
      )}

      <p className="result-count" aria-live="polite">
        Tìm thấy <strong>{filtered.length}</strong> bãi câu
        {filtered.length !== spots.length && <> (trên tổng số {spots.length})</>}
        {userPos && view === 'list' && filtered.length > 0 && <> — GẦN BẠN NHẤT xếp trước</>}
      </p>

      {view === 'map' ? (
        <>
          <SpotsMap spots={filtered} ownSpots={ownSpots} userPos={userPos} />
          <div className="map-legend">
            {kinds.map((k) => (
              <span key={k.key}>
                <i style={{ background: KIND_COLORS[k.key] }} /> {k.label}
              </span>
            ))}
            {ownSpots.length > 0 && (
              <span>
                <i style={{ background: '#F59E0B' }} /> Bãi của bạn (chờ duyệt)
              </span>
            )}
            <span className="map-credit-inline">© Những người đóng góp OpenStreetMap</span>
          </div>
          {filtered.length === 0 && (
            <div className="empty-box" style={{ marginTop: 16 }}>
              Không có bãi nào khớp bộ lọc để hiện trên bản đồ.
            </div>
          )}
        </>
      ) : filtered.length === 0 ? (
        <div className="empty-box">
          Không tìm thấy bãi nào khớp bộ lọc. Thử bỏ bớt điều kiện, hoặc gõ không dấu xem sao —
          biết đâu bãi bạn tìm chưa có trong danh bạ: hãy{' '}
          <Link href="/dong-gop">đóng góp bãi mới</Link> cho cộng đồng.
        </div>
      ) : (
        <div className="grid grid-3">
          {displayed.map((s) => (
            <SpotCard key={s.slug} spot={s} distanceKm={distances?.get(s.slug) ?? null} />
          ))}
        </div>
      )}
    </>
  );
}
