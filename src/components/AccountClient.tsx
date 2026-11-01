'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { Avatar, InlineMsg } from './bits';
import { AVATAR_PALETTE } from '@/lib/constants';
import {
  fetchMyReports,
  fetchMySpots,
  fetchMySuggestions,
  updateProfile,
} from '@/lib/supabase';

/**
 * "Tài khoản" — profile (Google identity + editable display name /
 * avatar colour), my-content shortcuts, the moderator entry (only
 * for moderators, with the pending-count badge), sign-out.
 */
export default function AccountClient() {
  const { ready, user, profile, isModerator, modPending, signIn, signOut, setProfile } = useAuth();
  const [counts, setCounts] = useState<{ reports: number; contributions: number } | null>(null);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [msgKind, setMsgKind] = useState<'ok' | 'err'>('ok');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile && !name) setName(profile.displayName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [reports, spots, suggestions] = await Promise.all([
        fetchMyReports(user.id),
        fetchMySpots(user.id),
        fetchMySuggestions(user.id),
      ]);
      if (alive) {
        setCounts({
          reports: reports.length,
          contributions: spots.length + suggestions.length,
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  if (!ready) return <p className="loading-note">Đang kiểm tra đăng nhập…</p>;

  if (!user) {
    return (
      <div className="empty-box">
        <p style={{ marginTop: 0 }}>
          Đăng nhập bằng tài khoản Google để đăng báo cá, đóng góp bãi câu mới, gợi ý sửa thông
          tin bãi và theo dõi trạng thái kiểm duyệt của chính bạn — ngay trên website này.
        </p>
        <button className="btn" onClick={() => void signIn()}>
          Đăng nhập bằng Google
        </button>
      </div>
    );
  }

  const saveName = async () => {
    if (!profile || !name.trim()) return;
    setBusy(true);
    const next = { ...profile, displayName: name.trim() };
    const ok = await updateProfile(next);
    setBusy(false);
    if (ok) {
      setProfile(next);
      setMsgKind('ok');
      setMsg('Đã lưu tên hiển thị.');
    } else {
      setMsgKind('err');
      setMsg('Chưa lưu được — kiểm tra mạng rồi thử lại.');
    }
  };

  const pickColor = async (idx: number) => {
    if (!profile) return;
    const next = { ...profile, avatarColor: idx };
    setProfile(next);
    await updateProfile(next);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section className="panel">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar user={user} profile={profile} size={64} />
          <div>
            <h2 style={{ margin: '0 0 2px' }}>{profile?.displayName ?? 'Cần thủ'}</h2>
            <p style={{ margin: 0, color: 'var(--ink-soft)' }}>{user.email}</p>
            {counts && (
              <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 14 }}>
                {counts.reports} báo cá · {counts.contributions} đóng góp
              </p>
            )}
          </div>
        </div>

        <div className="field" style={{ marginTop: 18 }}>
          <label htmlFor="ac-name">Tên hiển thị</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              id="ac-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ flex: '1 1 220px' }}
            />
            <button type="button" className="btn" onClick={() => void saveName()} disabled={busy}>
              Lưu
            </button>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Màu avatar</span>
          <div className="avatar-colors">
            {AVATAR_PALETTE.map((c, i) => (
              <button
                key={c}
                type="button"
                className={`avatar-color${profile?.avatarColor === i ? ' on' : ''}`}
                style={{ background: c }}
                onClick={() => void pickColor(i)}
                aria-label={`Màu avatar ${i + 1}`}
              />
            ))}
          </div>
        </div>
        <InlineMsg text={msg} kind={msgKind} />
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Nội dung của tôi</h2>
        <ul className="link-list">
          <li>
            <Link href="/tai-khoan/bao-ca">🎣 Báo cá của tôi</Link>
            <span>Các báo cá bạn đã đăng, kèm trạng thái duyệt thật.</span>
          </li>
          <li>
            <Link href="/tai-khoan/dong-gop">📍 Đóng góp của tôi</Link>
            <span>Bãi câu mới và gợi ý sửa bạn đã gửi, kèm trạng thái.</span>
          </li>
          <li>
            <Link href="/nhat-ky">📒 Nhật ký câu</Link>
            <span>Sổ tay chuyến đi — chỉ lưu trên thiết bị này.</span>
          </li>
          {isModerator && (
            <li>
              <Link href="/kiem-duyet">
                🛡️ Kiểm duyệt nội dung{' '}
                {modPending > 0 && <span className="mod-badge">{modPending}</span>}
              </Link>
              <span>Duyệt bãi câu, báo cá, gợi ý sửa và báo cáo vi phạm của cộng đồng.</span>
            </li>
          )}
        </ul>
      </section>

      <section className="panel">
        <button type="button" className="btn-outline" onClick={() => void signOut()}>
          Đăng xuất
        </button>
        <p className="form-note" style={{ marginTop: 12 }}>
          Vị trí "Gần bạn" chỉ dùng ngay trong trình duyệt để tính khoảng cách tới bãi — không
          lưu, không gửi đi đâu.
        </p>
      </section>
    </div>
  );
}
