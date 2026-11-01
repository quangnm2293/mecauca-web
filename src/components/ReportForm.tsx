'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { InlineMsg, SignInPrompt } from './bits';
import SpotPicker from './SpotPicker';
import { COMMON_SPECIES, newClientId } from '@/lib/constants';
import { todayICT } from '@/lib/astro';
import {
  fetchApprovedSpotsForPicker,
  fetchMySpots,
  insertReport,
  type PickerSpot,
} from '@/lib/supabase';
import { spots as staticSpots } from '@/lib/data';

function todayKey(): string {
  const t = todayICT();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.y}-${p(t.m)}-${p(t.d)}`;
}

/**
 * "Đăng báo cá" — the app's full report form. Web rule (per spec):
 * posting requires sign-in; the row goes straight to the moderation
 * queue as 'pending' under the user's account.
 */
export default function ReportForm({ initialSlug = null }: { initialSlug?: string | null }) {
  const { user, profile, ready } = useAuth();
  const [pickerSpots, setPickerSpots] = useState<PickerSpot[]>([]);
  const [spot, setSpot] = useState<PickerSpot | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [species, setSpecies] = useState('');
  const [weight, setWeight] = useState('');
  const [bait, setBait] = useState('');
  const [note, setNote] = useState('');
  const [author, setAuthor] = useState('');
  const [date, setDate] = useState(todayKey());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgKind, setMsgKind] = useState<'ok' | 'err'>('ok');
  const [done, setDone] = useState(false);

  // Prefill the display name from the profile once it loads.
  useEffect(() => {
    if (profile && !author) setAuthor(profile.displayName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [approved, mine] = await Promise.all([
        fetchApprovedSpotsForPicker(),
        fetchMySpots(user.id),
      ]);
      if (!alive) return;
      const own: PickerSpot[] = mine.map((s) => ({
        serverId: s.serverId,
        slug: s.clientId,
        name: s.name,
        province: s.province,
        kind: s.kind,
        status: s.status,
      }));
      const ownIds = new Set(own.map((s) => s.serverId));
      let list = [...own, ...approved.filter((s) => !ownIds.has(s.serverId))];
      if (list.length === 0) {
        // Backend unreachable — fall back to the build-time snapshot.
        list = staticSpots
          .filter((s) => s.serverId)
          .map((s) => ({
            serverId: s.serverId as string,
            slug: s.slug,
            name: s.name,
            province: s.province,
            kind: s.kind,
            status: 'approved',
          }));
      }
      setPickerSpots(list);
      const initial =
        (initialSlug && list.find((s) => s.slug === initialSlug)) || list[0] || null;
      setSpot((prev) => prev ?? initial);
    })();
    return () => {
      alive = false;
    };
  }, [user, initialSlug]);

  const tomorrowKey = useMemo(() => {
    const d = new Date(`${todayKey()}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  if (!ready) return <p className="loading-note">Đang kiểm tra đăng nhập…</p>;
  if (!user) return <SignInPrompt feature="đăng báo cá" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!spot) errs.spot = 'Chọn bãi câu';
    if (!species.trim()) errs.species = 'Nhập loài cá';
    if (!author.trim()) errs.author = 'Nhập tên hiển thị';
    setErrors(errs);
    if (Object.keys(errs).length > 0 || !spot) return;
    setBusy(true);
    setMsg('');
    const weightNum = Number(weight.trim().replace(',', '.'));
    const ok = await insertReport(user.id, {
      clientId: newClientId('bc'),
      spotServerId: spot.serverId,
      species: species.trim(),
      weightKg: weight.trim() && Number.isFinite(weightNum) ? weightNum : null,
      bait: bait.trim(),
      note: note.trim(),
      authorName: author.trim(),
      caughtOn: date,
    });
    setBusy(false);
    if (ok) {
      setDone(true);
      setMsgKind('ok');
      setMsg('Đã gửi báo cá! Báo cá đang ở trạng thái "Chờ duyệt" — được duyệt xong sẽ công khai trong mục Báo cá.');
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
          <Link className="btn" href="/tai-khoan/bao-ca">
            Xem báo cá của tôi
          </Link>{' '}
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setDone(false);
              setSpecies('');
              setWeight('');
              setBait('');
              setNote('');
              setMsg('');
            }}
          >
            Đăng thêm báo cá
          </button>
        </p>
      </div>
    );
  }

  return (
    <form className="web-form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="rf-spot">Bãi câu *</label>
        <button
          id="rf-spot"
          type="button"
          className="picker-field"
          onClick={() => setPickerOpen(true)}
        >
          <span>
            {spot
              ? `${spot.name}${spot.status === 'pending' ? ' (chờ duyệt)' : ''}`
              : 'Chọn bãi câu'}
          </span>
          <span aria-hidden>▾</span>
        </button>
        {errors.spot && <p className="field-err">{errors.spot}</p>}
      </div>

      <div className="field">
        <label htmlFor="rf-species">Loài cá *</label>
        <input
          id="rf-species"
          type="text"
          placeholder="VD: Chép, Rô phi…"
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
        />
        <div className="chip-row">
          {COMMON_SPECIES.slice(0, 8).map((sp) => (
            <button
              key={sp}
              type="button"
              className="chip-btn"
              onClick={() => setSpecies(sp)}
            >
              {sp}
            </button>
          ))}
        </div>
        {errors.species && <p className="field-err">{errors.species}</p>}
      </div>

      <div className="field">
        <label htmlFor="rf-weight">Cân nặng (kg, không bắt buộc)</label>
        <input
          id="rf-weight"
          type="text"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="rf-bait">Mồi đã dùng</label>
        <input id="rf-bait" type="text" value={bait} onChange={(e) => setBait(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="rf-note">Ghi chú (khung giờ, tầng ăn…)</label>
        <textarea
          id="rf-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="rf-author">Tên hiển thị của bạn *</label>
        <input
          id="rf-author"
          type="text"
          placeholder="Tên/biệt danh hiện cùng báo cá"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        {errors.author && <p className="field-err">{errors.author}</p>}
      </div>

      <div className="field">
        <label htmlFor="rf-date">Ngày câu</label>
        <input
          id="rf-date"
          type="date"
          min="2020-01-01"
          max={tomorrowKey}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <p className="form-note">
        Báo cá của bạn sẽ ở trạng thái "Chờ duyệt" và hiện trong mục "Báo cá của tôi" với trạng
        thái thật. Được kiểm duyệt xong, báo cá mới công khai cho cộng đồng.
      </p>

      <InlineMsg text={msg} kind={msgKind} />

      <div className="sticky-submit">
        <button type="submit" className="btn btn-block" disabled={busy}>
          🎣 {busy ? 'Đang gửi…' : 'Đăng báo cá'}
        </button>
      </div>

      {pickerOpen && (
        <SpotPicker
          spots={pickerSpots}
          selectedId={spot?.serverId ?? null}
          onPick={(s) => {
            setSpot(s);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </form>
  );
}
