'use client';

import Link from 'next/link';
import { AVATAR_PALETTE, STATUS_LABEL } from '@/lib/constants';
import type { Profile } from '@/lib/supabase';
import { googleAvatar } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useAuth } from './AuthProvider';

/** Moderation status chip — same labels/colours as the app. */
export function StatusChip({ status }: { status: string }) {
  const cls =
    status === 'approved' || status === 'applied'
      ? 'chip-status ok'
      : status === 'rejected'
        ? 'chip-status bad'
        : 'chip-status wait';
  return <span className={cls}>{STATUS_LABEL[status] ?? status}</span>;
}

/** Round avatar: Google photo when available, else initial letter
 *  on the user's chosen palette colour (the app's approach). */
export function Avatar({
  user,
  profile,
  size = 34,
}: {
  user: User;
  profile: Profile | null;
  size?: number;
}) {
  const photo = googleAvatar(user);
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={photo}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: '50%', display: 'block' }}
        referrerPolicy="no-referrer"
      />
    );
  }
  const name = profile?.displayName || 'Cần thủ';
  const color = AVATAR_PALETTE[(profile?.avatarColor ?? 0) % AVATAR_PALETTE.length];
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontWeight: 800,
        fontSize: size * 0.45,
        flex: 'none',
      }}
    >
      {name.trim().charAt(0).toUpperCase() || 'C'}
    </span>
  );
}

/** Shown in place of a members-only feature when signed out. */
export function SignInPrompt({ feature }: { feature: string }) {
  const { signIn, ready } = useAuth();
  return (
    <div className="empty-box">
      <p style={{ marginTop: 0 }}>
        Bạn cần đăng nhập để {feature}. Tài khoản giúp báo cá và đóng góp của bạn được ghi nhận
        đúng tên và hiện trạng thái duyệt.
      </p>
      <button className="btn" onClick={() => void signIn()} disabled={!ready}>
        Đăng nhập bằng Google
      </button>
      <p style={{ marginBottom: 0, fontSize: 13 }}>
        Chưa có tài khoản? <Link href="/tai-khoan">Xem trang Tài khoản</Link>
      </p>
    </div>
  );
}

/** Small toast-style inline message. */
export function InlineMsg({ text, kind = 'ok' }: { text: string; kind?: 'ok' | 'err' }) {
  if (!text) return null;
  return (
    <p className={kind === 'ok' ? 'msg-ok' : 'msg-err'} role="status">
      {text}
    </p>
  );
}
