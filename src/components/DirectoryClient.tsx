'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SpotCard from './SpotCard';
import { kinds, provinces, regions, spots } from '@/lib/data';
import { matchesQuery } from '@/lib/fold';

export default function DirectoryClient() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [kind, setKind] = useState(params.get('loai') ?? '');

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

      <p className="result-count" aria-live="polite">
        Tìm thấy <strong>{filtered.length}</strong> bãi câu
        {filtered.length !== spots.length && <> (trên tổng số {spots.length})</>}
      </p>

      {filtered.length === 0 ? (
        <div className="empty-box">
          Không tìm thấy bãi nào khớp bộ lọc. Thử bỏ bớt điều kiện, hoặc gõ không dấu xem sao —
          biết đâu bãi bạn tìm đang chờ cộng đồng bổ sung trong ứng dụng.
        </div>
      ) : (
        <div className="grid grid-3">
          {filtered.map((s) => (
            <SpotCard key={s.slug} spot={s} />
          ))}
        </div>
      )}
    </>
  );
}
