'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { InlineMsg, SignInPrompt } from './bits';
import { KIND_LABELS } from '@/lib/constants';
import { formatDateVi } from '@/lib/fold';
import {
  applySuggestion,
  fetchModerationQueue,
  updateRowStatus,
  type ModerationQueue,
  type ModSuggestionItem,
  type MySpotRow,
} from '@/lib/supabase';
import { suggestionCurrentValue, suggestionSpotPatch } from '@/lib/suggestionPatch';

type Filter = 'all' | 'spots' | 'reports' | 'suggestions' | 'flags';

function authorLine(
  q: ModerationQueue,
  createdBy: string | null,
  createdAt: string | null,
): string {
  const name = createdBy ? (q.authorNames.get(createdBy) ?? 'Cần thủ') : 'Cần thủ';
  if (!createdAt) return `Người gửi: ${name}`;
  const d = createdAt.slice(0, 10);
  const [y, m, dd] = d.split('-');
  return `Người gửi: ${name} · ${dd}/${m}/${y}`;
}

function genericTargetLabel(targetType: string): string {
  switch (targetType) {
    case 'spot':
      return 'Bãi câu';
    case 'catchReport':
      return 'Báo cá';
    case 'suggestion':
      return 'Gợi ý sửa';
    default:
      return 'Nội dung bị báo cáo';
  }
}

/**
 * "Kiểm duyệt nội dung" — the moderation panel, mirroring the app:
 * queues for spots / catch reports / suggestions / UGC reports with
 * Duyệt / Từ chối, and suggestion "Áp dụng" writing the validated
 * correction into the spot. Moderators only — everyone else is
 * stopped at the guard (and the backend enforces it too).
 */
export default function ModerationClient() {
  const { user, ready, isModerator, refreshModPending } = useAuth();
  const [queue, setQueue] = useState<ModerationQueue | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');
  const [msgKind, setMsgKind] = useState<'ok' | 'err'>('ok');
  const [applying, setApplying] = useState<ModSuggestionItem | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    const q = await fetchModerationQueue();
    if (q) setQueue(q);
    else setFailed(true);
  }, []);

  useEffect(() => {
    if (user && isModerator) void load();
  }, [user, isModerator, load]);

  if (!ready) return <p className="loading-note">Đang kiểm tra đăng nhập…</p>;
  if (!user) return <SignInPrompt feature="vào trang kiểm duyệt" />;
  if (!isModerator) {
    return (
      <div className="empty-box">
        Trang này chỉ dành cho đội kiểm duyệt nội dung. Nếu bạn được phân quyền kiểm duyệt, hãy
        đăng nhập bằng đúng tài khoản đó.
      </div>
    );
  }
  if (failed) {
    return (
      <div className="empty-box">
        <p style={{ marginTop: 0 }}>Chưa tải được danh sách chờ duyệt.</p>
        <button className="btn" onClick={() => void load()}>
          Thử lại
        </button>
      </div>
    );
  }
  if (!queue) return <p className="loading-note">Đang tải danh sách chờ duyệt…</p>;

  const total =
    queue.pendingSpots.length +
    queue.pendingReports.length +
    queue.pendingSuggestions.length +
    queue.openFlags.length;

  const dropAndRefresh = (mutate: (q: ModerationQueue) => ModerationQueue) => {
    setQueue((q) => (q ? mutate(q) : q));
    void refreshModPending();
  };

  const setStatus = async (
    key: string,
    table: 'spots' | 'catch_reports' | 'spot_suggestions' | 'reports_moderation',
    serverId: string,
    status: string,
    doneMessage: string,
    drop: (q: ModerationQueue) => ModerationQueue,
  ) => {
    if (busy.has(key)) return;
    setBusy((b) => new Set(b).add(key));
    const ok = await updateRowStatus(table, serverId, status);
    setBusy((b) => {
      const next = new Set(b);
      next.delete(key);
      return next;
    });
    if (ok) {
      dropAndRefresh(drop);
      setMsgKind('ok');
      setMsg(doneMessage);
    } else {
      setMsgKind('err');
      setMsg('Chưa làm được — kiểm tra mạng rồi thử lại');
    }
  };

  const doApply = async (item: ModSuggestionItem, confirmedText: string) => {
    const patch = suggestionSpotPatch(item.field, confirmedText);
    if (patch.error) {
      setMsgKind('err');
      setMsg(patch.error);
      setApplying(null);
      return;
    }
    const key = `suggestion-${item.serverId}`;
    if (busy.has(key)) return;
    setBusy((b) => new Set(b).add(key));
    const ok = await applySuggestion(item.serverId, item.spotServerId, patch.spotColumns);
    setBusy((b) => {
      const next = new Set(b);
      next.delete(key);
      return next;
    });
    setApplying(null);
    if (ok) {
      dropAndRefresh((q) => ({
        ...q,
        pendingSuggestions: q.pendingSuggestions.filter((s) => s.serverId !== item.serverId),
      }));
      setMsgKind('ok');
      setMsg('Đã áp dụng gợi ý sửa');
    } else {
      setMsgKind('err');
      setMsg('Chưa làm được — kiểm tra mạng rồi thử lại');
    }
  };

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'Tất cả', count: total },
    { key: 'spots', label: 'Bãi câu', count: queue.pendingSpots.length },
    { key: 'reports', label: 'Báo cá', count: queue.pendingReports.length },
    { key: 'suggestions', label: 'Gợi ý sửa', count: queue.pendingSuggestions.length },
    { key: 'flags', label: 'Báo cáo', count: queue.openFlags.length },
  ];
  const visibleCount =
    filter === 'all'
      ? total
      : filter === 'spots'
        ? queue.pendingSpots.length
        : filter === 'reports'
          ? queue.pendingReports.length
          : filter === 'suggestions'
            ? queue.pendingSuggestions.length
            : queue.openFlags.length;

  const spotNameOf = (serverId: string) =>
    queue.spotsByServerId.get(serverId)?.name ?? queue.spotNames.get(serverId) ?? null;

  return (
    <div>
      <div className="chip-row" role="tablist" aria-label="Lọc hàng chờ">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`chip-btn${filter === c.key ? ' on' : ''}`}
            onClick={() => setFilter(c.key)}
            aria-pressed={filter === c.key}
          >
            {c.label} ({c.count})
          </button>
        ))}
        <button type="button" className="chip-btn" onClick={() => void load()}>
          ↻ Tải lại
        </button>
      </div>

      <InlineMsg text={msg} kind={msgKind} />

      {visibleCount === 0 ? (
        <div className="empty-box" style={{ marginTop: 16 }}>
          {total === 0
            ? 'Không có nội dung nào chờ duyệt 🎉'
            : 'Mục này không có nội dung nào chờ duyệt.'}
        </div>
      ) : (
        <div className="grid" style={{ gap: 12, marginTop: 16 }}>
          {(filter === 'all' || filter === 'spots') &&
            queue.pendingSpots.map((s) => {
              const key = `spot-${s.serverId}`;
              const isBusy = busy.has(key);
              return (
                <article key={key} className="card mod-card">
                  <span className="type-chip primary">📍 Bãi câu mới</span>
                  <h3>{s.name}</h3>
                  <p className="desc">
                    {s.province} · {KIND_LABELS[s.kind] ?? s.kind} · {s.region}
                    <br />
                    Toạ độ: {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                    {s.species.length > 0 && (
                      <>
                        <br />
                        Loài cá: {s.species.join(', ')}
                      </>
                    )}
                    {s.ticketNote && (
                      <>
                        <br />
                        Giá vé: {s.ticketNote}
                      </>
                    )}
                    {s.description && (
                      <>
                        <br />
                        {s.description}
                      </>
                    )}
                    <br />
                    {authorLine(queue, s.createdBy, s.createdAt)}
                  </p>
                  <div className="mod-actions">
                    <button
                      type="button"
                      className="btn"
                      disabled={isBusy}
                      onClick={() =>
                        void setStatus(key, 'spots', s.serverId, 'approved', 'Đã duyệt bãi câu', (q) => ({
                          ...q,
                          pendingSpots: q.pendingSpots.filter((x) => x.serverId !== s.serverId),
                        }))
                      }
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      disabled={isBusy}
                      onClick={() =>
                        void setStatus(key, 'spots', s.serverId, 'rejected', 'Đã từ chối bãi câu', (q) => ({
                          ...q,
                          pendingSpots: q.pendingSpots.filter((x) => x.serverId !== s.serverId),
                        }))
                      }
                    >
                      Từ chối
                    </button>
                  </div>
                </article>
              );
            })}

          {(filter === 'all' || filter === 'reports') &&
            queue.pendingReports.map((r) => {
              const key = `report-${r.serverId}`;
              const isBusy = busy.has(key);
              const spotName = spotNameOf(r.spotServerId);
              const weight =
                r.weightKg != null
                  ? ` · ${String(r.weightKg).replace('.', ',')} kg`
                  : '';
              return (
                <article key={key} className="card mod-card">
                  <span className="type-chip teal">🎣 Báo cá</span>
                  <h3>
                    {r.species}
                    {weight}
                  </h3>
                  <p className="desc">
                    {spotName && (
                      <>
                        Bãi: {spotName}
                        <br />
                      </>
                    )}
                    {r.bait && (
                      <>
                        Mồi: {r.bait}
                        <br />
                      </>
                    )}
                    {r.note && (
                      <>
                        {r.note}
                        <br />
                      </>
                    )}
                    Ngày câu: {formatDateVi(r.caughtOn)}
                    <br />
                    {authorLine(queue, r.createdBy, r.createdAt)}
                  </p>
                  <div className="mod-actions">
                    <button
                      type="button"
                      className="btn"
                      disabled={isBusy}
                      onClick={() =>
                        void setStatus(key, 'catch_reports', r.serverId, 'approved', 'Đã duyệt báo cá', (q) => ({
                          ...q,
                          pendingReports: q.pendingReports.filter((x) => x.serverId !== r.serverId),
                        }))
                      }
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      disabled={isBusy}
                      onClick={() =>
                        void setStatus(key, 'catch_reports', r.serverId, 'rejected', 'Đã từ chối báo cá', (q) => ({
                          ...q,
                          pendingReports: q.pendingReports.filter((x) => x.serverId !== r.serverId),
                        }))
                      }
                    >
                      Từ chối
                    </button>
                  </div>
                </article>
              );
            })}

          {(filter === 'all' || filter === 'suggestions') &&
            queue.pendingSuggestions.map((g) => {
              const key = `suggestion-${g.serverId}`;
              const isBusy = busy.has(key);
              const spotName = spotNameOf(g.spotServerId);
              return (
                <article key={key} className="card mod-card">
                  <span className="type-chip amber">✏️ Gợi ý sửa</span>
                  <h3>{g.field}</h3>
                  <p className="desc">
                    {spotName && (
                      <>
                        Bãi: {spotName}
                        <br />
                      </>
                    )}
                    Nội dung sửa: {g.correctedText}
                    {g.note && (
                      <>
                        <br />
                        Ghi chú: {g.note}
                      </>
                    )}
                    <br />
                    {authorLine(queue, g.createdBy, g.createdAt)}
                  </p>
                  <div className="mod-actions">
                    <button
                      type="button"
                      className="btn"
                      disabled={isBusy}
                      onClick={() => setApplying(g)}
                    >
                      Áp dụng
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      disabled={isBusy}
                      onClick={() =>
                        void setStatus(key, 'spot_suggestions', g.serverId, 'rejected', 'Đã từ chối gợi ý sửa', (q) => ({
                          ...q,
                          pendingSuggestions: q.pendingSuggestions.filter((x) => x.serverId !== g.serverId),
                        }))
                      }
                    >
                      Từ chối
                    </button>
                  </div>
                </article>
              );
            })}

          {(filter === 'all' || filter === 'flags') &&
            queue.openFlags.map((f) => {
              const key = `flag-${f.serverId}`;
              const isBusy = busy.has(key);
              const label = queue.targetLabels.get(f.targetId) ?? genericTargetLabel(f.targetType);
              return (
                <article key={key} className="card mod-card">
                  <span className="type-chip red">⚑ Báo cáo vi phạm</span>
                  <h3>{label}</h3>
                  <p className="desc">
                    Lý do: {f.reason === '' ? '(không ghi)' : f.reason}
                    <br />
                    {authorLine(queue, f.createdBy, f.createdAt)}
                  </p>
                  <div className="mod-actions">
                    <button
                      type="button"
                      className="btn"
                      disabled={isBusy}
                      onClick={() =>
                        void setStatus(key, 'reports_moderation', f.serverId, 'actioned', 'Đã đánh dấu báo cáo là đã xử lý', (q) => ({
                          ...q,
                          openFlags: q.openFlags.filter((x) => x.serverId !== f.serverId),
                        }))
                      }
                    >
                      Đã xử lý
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      disabled={isBusy}
                      onClick={() =>
                        void setStatus(key, 'reports_moderation', f.serverId, 'dismissed', 'Đã bỏ qua báo cáo', (q) => ({
                          ...q,
                          openFlags: q.openFlags.filter((x) => x.serverId !== f.serverId),
                        }))
                      }
                    >
                      Bỏ qua
                    </button>
                  </div>
                </article>
              );
            })}
        </div>
      )}

      {applying && (
        <ApplySheet
          item={applying}
          spot={queue.spotsByServerId.get(applying.spotServerId) ?? null}
          onCancel={() => setApplying(null)}
          onApply={(text) => void doApply(applying, text)}
        />
      )}
    </div>
  );
}

/** Confirm sheet for a suggestion apply: current value vs an
 *  editable field prefilled with the suggested text. */
function ApplySheet({
  item,
  spot,
  onCancel,
  onApply,
}: {
  item: ModSuggestionItem;
  spot: MySpotRow | null;
  onCancel: () => void;
  onApply: (text: string) => void;
}) {
  const [text, setText] = useState(item.correctedText);
  const isOther = item.field === 'Khác';
  return (
    <div className="modal-backdrop" onClick={onCancel} role="presentation">
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Áp dụng gợi ý sửa"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <strong>Áp dụng gợi ý sửa</strong>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label="Đóng">
            ✕
          </button>
        </div>
        <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>
          {spot?.name ?? 'Bãi câu'} · Trường: {item.field}
        </p>
        <p style={{ marginBottom: 4 }}>
          <strong>Giá trị hiện tại:</strong>
        </p>
        <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>
          {spot
            ? suggestionCurrentValue(item.field, spot)
            : '(không tải được giá trị hiện tại)'}
        </p>
        <div className="field">
          <label htmlFor="apply-text">Giá trị mới (sửa lại nếu cần):</label>
          <textarea
            id="apply-text"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        {isOther && (
          <p className="msg-err" style={{ background: '#fffbeb', color: '#92400e' }}>
            Gợi ý loại "Khác" không tự ghi vào bãi — bấm Áp dụng chỉ đánh dấu gợi ý này là đã xử
            lý.
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-outline" onClick={onCancel}>
            Huỷ
          </button>
          <button type="button" className="btn" onClick={() => onApply(text.trim())}>
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
