'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { KIND_LABELS } from '@/lib/constants';
import { matchesQuery } from '@/lib/fold';
import { KIND_COLORS } from '@/lib/types';
import type { PickerSpot } from '@/lib/supabase';

/**
 * Spot picker for the report form — the app's full-screen picker
 * as a modal: search pinned at the top, live filtering by spot
 * name OR province, diacritics-insensitive ("tri an" → Trị An).
 */
export default function SpotPicker({
  spots,
  selectedId,
  onPick,
  onClose,
}: {
  spots: PickerSpot[];
  selectedId: string | null;
  onPick: (s: PickerSpot) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(
    () =>
      spots.filter(
        (s) => matchesQuery(s.name, q) || matchesQuery(s.province, q),
      ),
    [spots, q],
  );

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Chọn bãi câu"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <strong>Chọn bãi câu</strong>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>
        <div className="picker-search">
          <input
            ref={inputRef}
            type="search"
            placeholder="Tìm bãi câu…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Tìm bãi câu"
          />
          {q && (
            <button type="button" className="icon-btn" onClick={() => setQ('')} aria-label="Xoá tìm kiếm">
              ✕
            </button>
          )}
        </div>
        <div className="picker-list">
          {filtered.length === 0 ? (
            <p className="empty-note">Không tìm thấy bãi nào</p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.serverId}
                type="button"
                className="picker-row"
                onClick={() => onPick(s)}
              >
                <span
                  className="picker-dot"
                  style={{ background: KIND_COLORS[s.kind] ?? '#0B6E4F' }}
                  aria-hidden
                />
                <span className="picker-main">
                  <span className="picker-name">
                    {s.name}
                    {s.status === 'pending' ? ' (chờ duyệt)' : ''}
                  </span>
                  <span className="picker-sub">
                    {s.province} · {KIND_LABELS[s.kind] ?? s.kind}
                  </span>
                </span>
                {s.serverId === selectedId && <span className="picker-check">✓</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
