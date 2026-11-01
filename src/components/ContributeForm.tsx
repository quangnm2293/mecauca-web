'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { InlineMsg, SignInPrompt } from './bits';
import {
  COMMON_SPECIES,
  FACILITIES,
  KIND_LABELS,
  PROVINCES34,
  newClientId,
  regionOfProvince,
} from '@/lib/constants';
import { insertSpot } from '@/lib/supabase';

const PinMap = dynamic(() => import('./Maps').then((m) => m.PinMap), {
  ssr: false,
  loading: () => <div className="leaflet-box pinmap loading-note">Đang tải bản đồ…</div>,
});

const KIND_KEYS = Object.keys(KIND_LABELS);

/**
 * "Thêm bãi câu mới" — the app's contribution form: name, kind,
 * province (34), map centre-pin location, species/facility chips,
 * ticket note, description. Submits as a pending community spot.
 */
export default function ContributeForm() {
  const { user, ready } = useAuth();
  const [name, setName] = useState('');
  const [kind, setKind] = useState('hoTuNhien');
  const [province, setProvince] = useState('Hà Nội');
  const [pos, setPos] = useState({ lat: 21.0278, lng: 105.8342 }); // Hà Nội
  const [species, setSpecies] = useState<Set<string>>(new Set());
  const [extraSpecies, setExtraSpecies] = useState('');
  const [facilities, setFacilities] = useState<Set<string>>(new Set());
  const [ticket, setTicket] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgKind, setMsgKind] = useState<'ok' | 'err'>('ok');
  const [done, setDone] = useState(false);

  if (!ready) return <p className="loading-note">Đang kiểm tra đăng nhập…</p>;
  if (!user) return <SignInPrompt feature="đóng góp bãi câu" />;

  const toggle = (set: Set<string>, v: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    apply(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Nhập tên bãi';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const allSpecies = new Set(species);
    for (const part of extraSpecies.split(',')) {
      const t = part.trim();
      if (t) allSpecies.add(t);
    }
    setBusy(true);
    setMsg('');
    const ok = await insertSpot(user.id, {
      clientId: newClientId('my'),
      name: name.trim(),
      province,
      region: regionOfProvince(province),
      lat: Number(pos.lat.toFixed(6)),
      lng: Number(pos.lng.toFixed(6)),
      kind,
      species: [...allSpecies],
      ticketNote: ticket.trim() || null,
      facilities: [...facilities],
      description: description.trim(),
    });
    setBusy(false);
    if (ok) {
      setDone(true);
      setMsgKind('ok');
      setMsg(
        'Đã thêm bãi! Bãi đang ở trạng thái "Chờ duyệt" — được kiểm duyệt xong sẽ hiện công khai trong danh bạ và bản đồ.',
      );
    } else {
      setMsgKind('err');
      setMsg('Chưa gửi được — kiểm tra mạng rồi thử lại.');
    }
  };

  if (done) {
    return (
      <div className="empty-box">
        <p style={{ marginTop: 0 }}>{msg}</p>
        <p style={{ marginBottom: 0 }}>
          <Link className="btn" href="/tai-khoan/dong-gop">
            Xem đóng góp của tôi
          </Link>{' '}
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setDone(false);
              setName('');
              setTicket('');
              setDescription('');
              setExtraSpecies('');
              setSpecies(new Set());
              setFacilities(new Set());
              setMsg('');
            }}
          >
            Thêm bãi khác
          </button>
        </p>
      </div>
    );
  }

  return (
    <form className="web-form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="cf-name">Tên bãi câu *</label>
        <input
          id="cf-name"
          type="text"
          placeholder="VD: Hồ câu ABC"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && <p className="field-err">{errors.name}</p>}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="cf-kind">Loại bãi</label>
          <select id="cf-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KIND_KEYS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cf-province">Tỉnh / thành</label>
          <select id="cf-province" value={province} onChange={(e) => setProvince(e.target.value)}>
            {PROVINCES34.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <span className="field-label">Vị trí bãi — kéo bản đồ, ghim ở giữa là bãi (bấm vào bản đồ để nhảy tới điểm đó)</span>
        <PinMap lat={pos.lat} lng={pos.lng} onChange={(lat, lng) => setPos({ lat, lng })} />
        <p className="form-note" style={{ marginTop: 6 }}>
          Toạ độ: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
        </p>
      </div>

      <div className="field">
        <span className="field-label">Loài cá thường có</span>
        <div className="chip-row">
          {COMMON_SPECIES.map((sp) => (
            <button
              key={sp}
              type="button"
              className={`chip-btn${species.has(sp) ? ' on' : ''}`}
              onClick={() => toggle(species, sp, setSpecies)}
              aria-pressed={species.has(sp)}
            >
              {sp}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Loài khác (cách nhau bằng dấu phẩy)"
          value={extraSpecies}
          onChange={(e) => setExtraSpecies(e.target.value)}
          style={{ marginTop: 8 }}
        />
      </div>

      <div className="field">
        <label htmlFor="cf-ticket">Giá vé (không bắt buộc)</label>
        <input
          id="cf-ticket"
          type="text"
          placeholder="VD: 200.000đ/ca 5 giờ, hoặc Miễn phí"
          value={ticket}
          onChange={(e) => setTicket(e.target.value)}
        />
        <p className="form-note">
          Chỉ ghi giá bạn chắc chắn (giá hồ tự đăng hoặc vừa đi về). Giá có thể thay đổi — khi
          đăng lên, đội kiểm duyệt sẽ kèm lưu ý "kiểm tra lại trước khi đi".
        </p>
      </div>

      <div className="field">
        <span className="field-label">Tiện ích</span>
        <div className="chip-row">
          {FACILITIES.map((f) => (
            <button
              key={f}
              type="button"
              className={`chip-btn${facilities.has(f) ? ' on' : ''}`}
              onClick={() => toggle(facilities, f, setFacilities)}
              aria-pressed={facilities.has(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="cf-desc">Mô tả ngắn về bãi</label>
        <textarea
          id="cf-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <p className="form-note">
        Bãi mới sẽ ở trạng thái "Chờ duyệt" cho đến khi được kiểm duyệt — chưa phải dữ liệu công
        khai. Bạn xem được bãi của mình (kèm trạng thái) trong mục "Đóng góp của tôi".
      </p>

      <InlineMsg text={msg} kind={msgKind} />

      <div className="sticky-submit">
        <button type="submit" className="btn btn-block" disabled={busy}>
          📍 {busy ? 'Đang gửi…' : 'Thêm bãi (chờ duyệt)'}
        </button>
      </div>
    </form>
  );
}
