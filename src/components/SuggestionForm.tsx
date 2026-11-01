'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { InlineMsg } from './bits';
import { SUGGESTION_FIELDS, newClientId } from '@/lib/constants';
import { insertSuggestion } from '@/lib/supabase';

/**
 * "Gợi ý sửa / Báo sai" for one spot — same fields and semantics as
 * the app: pick a field, write the corrected text + optional note;
 * lands in the moderation queue as a pending suggestion.
 */
export default function SuggestionForm({
  serverId,
  spotName,
}: {
  serverId: string | null;
  spotName: string;
}) {
  const { user, signIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [field, setField] = useState(SUGGESTION_FIELDS[0]);
  const [corrected, setCorrected] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgKind, setMsgKind] = useState<'ok' | 'err'>('ok');

  if (!serverId) {
    return (
      <p className="loading-note">
        Thông tin bãi này chưa đồng bộ lên hệ thống cộng đồng nên chưa gửi gợi ý sửa được.
      </p>
    );
  }

  if (!open) {
    return (
      <div>
        <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>
          Thấy thông tin ở bãi <strong>{spotName}</strong> chưa đúng? Gửi gợi ý sửa — đội kiểm
          duyệt xác nhận xong mới áp dụng, để dữ liệu luôn chuẩn.
        </p>
        {user ? (
          <button type="button" className="btn-outline" onClick={() => setOpen(true)}>
            ✏️ Gợi ý sửa / Báo sai
          </button>
        ) : (
          <button type="button" className="btn-outline" onClick={() => void signIn()}>
            Đăng nhập để gợi ý sửa
          </button>
        )}
        <InlineMsg text={msg} kind={msgKind} />
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!corrected.trim()) {
      setErr('Nhập nội dung đúng');
      return;
    }
    setErr('');
    setBusy(true);
    const ok = await insertSuggestion(user!.id, {
      clientId: newClientId('gy'),
      spotServerId: serverId,
      field,
      correctedText: corrected.trim(),
      note: note.trim(),
    });
    setBusy(false);
    if (ok) {
      setOpen(false);
      setCorrected('');
      setNote('');
      setMsgKind('ok');
      setMsg('Đã gửi gợi ý sửa — đang ở trạng thái "Chờ duyệt". Cảm ơn bạn đã giúp dữ liệu chuẩn hơn!');
    } else {
      setMsgKind('err');
      setMsg('Chưa gửi được — kiểm tra mạng rồi thử lại.');
    }
  };

  return (
    <form className="web-form" onSubmit={submit} noValidate>
      <p style={{ marginTop: 0 }}>
        Bãi: <strong>{spotName}</strong>
      </p>
      <div className="field">
        <label htmlFor="sf-field">Thông tin cần sửa</label>
        <select id="sf-field" value={field} onChange={(e) => setField(e.target.value)}>
          {SUGGESTION_FIELDS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="sf-corrected">Nội dung đúng là *</label>
        <textarea
          id="sf-corrected"
          rows={2}
          placeholder="VD: Giá vé 150.000đ/ca 4 giờ"
          value={corrected}
          onChange={(e) => setCorrected(e.target.value)}
        />
        {err && <p className="field-err">{err}</p>}
      </div>
      <div className="field">
        <label htmlFor="sf-note">Ghi chú / nguồn kiểm chứng (không bắt buộc)</label>
        <textarea
          id="sf-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <InlineMsg text={msg} kind={msgKind} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Đang gửi…' : 'Gửi gợi ý (chờ duyệt)'}
        </button>
        <button type="button" className="btn-outline" onClick={() => setOpen(false)}>
          Huỷ
        </button>
      </div>
    </form>
  );
}
