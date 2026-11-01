'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { Avatar } from './bits';

/** Header account entry: avatar (→ Tài khoản) when signed in,
 *  otherwise a "Đăng nhập" link. */
export default function HeaderAuth() {
  const { ready, user, profile, isModerator, modPending } = useAuth();
  if (!ready) return null;
  if (!user) {
    return (
      <Link href="/tai-khoan" className="nav-acct">
        Đăng nhập
      </Link>
    );
  }
  return (
    <Link href="/tai-khoan" className="nav-acct" aria-label="Tài khoản của tôi">
      <Avatar user={user} profile={profile} size={30} />
      <span className="hide-sm">{profile?.displayName ?? 'Tài khoản'}</span>
      {isModerator && modPending > 0 && <span className="mod-badge">{modPending}</span>}
    </Link>
  );
}
