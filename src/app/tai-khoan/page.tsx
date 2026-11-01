import type { Metadata } from 'next';
import Link from 'next/link';
import AccountClient from '@/components/AccountClient';

export const metadata: Metadata = {
  title: 'Tài khoản — Mê Câu Cá',
  description:
    'Tài khoản Mê Câu Cá: đăng nhập bằng Google, xem báo cá và đóng góp của bạn kèm trạng thái kiểm duyệt.',
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <div className="wrap">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/">Trang chủ</Link> / Tài khoản
      </nav>
      <div className="spot-head">
        <h1>Tài khoản</h1>
      </div>
      <div style={{ maxWidth: 760 }}>
        <AccountClient />
      </div>
    </div>
  );
}
