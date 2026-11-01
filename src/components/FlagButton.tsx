'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { newClientId } from '@/lib/constants';
import { insertModerationReport } from '@/lib/supabase';

/**
 * "Báo cáo nội dung" — the app's UGC report action: optional reason,
 * lands in reports_moderation for the moderation team. Signed-in
 * users only (the backend requires an account).
 */
export default function FlagButton({
  targetType,
  targetId,
  label = 'Báo cáo',
}: {
  targetType: 'spot' | 'catchReport' | 'suggestion';
  targetId: string;
  label?: string;
}) {
  const { user, signIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return <span className="flag-done">Đã ghi nhận báo cáo. Cảm ơn bạn!</span>;
  }

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const ok = await insertModerationReport(user.id, {
      clientId: newClientId('rep'),
      targetType,
      targetId,
      reason: reason.trim(),
    });
    setBusy(false);
    if (ok) {
      setOpen(false);
      setDone(true);
    }
  };

  return (
    <>
      <button
        type="button"
        className="flag-btn"
        title="Báo cáo nội dung"
        onClick={() => (user ? setOpen(true) : void signIn())}
      >
        ⚑ {label}
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)} role="presentation">
          <div
            className="modal-sheet small"
            role="dialog"
            aria-modal="true"
            aria-label="Báo cáo nội dung"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <strong>Báo cáo nội dung</strong>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Đóng">
                ✕
              </button>
            </div>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
              Báo cáo sẽ được đội kiểm duyệt xem xét. Nội dung vi phạm sẽ bị gỡ.
            </p>
            <div className="field">
              <label htmlFor="flag-reason">Lý do (không bắt buộc)</label>
              <textarea
                id="flag-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-outline" onClick={() => setOpen(false)}>
                Huỷ
              </button>
              <button type="button" className="btn" disabled={busy} onClick={() => void submit()}>
                {busy ? 'Đang gửi…' : 'Gửi báo cáo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
