import type { Metadata } from 'next';
import Link from 'next/link';
import { MyReportsClient } from '@/components/MyContent';

export const metadata: Metadata = {
  title: 'Báo cá của tôi — Mê Câu Cá',
  robots: { index: false },
};

export default function MyReportsPage() {
  return (
    <div className="wrap">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/">Trang chủ</Link> / <Link href="/tai-khoan">Tài khoản</Link> / Báo cá của
        tôi
      </nav>
      <div className="spot-head">
        <h1>Báo cá của tôi</h1>
        <p style={{ color: 'var(--ink-soft)', maxWidth: 720 }}>
          Mọi báo cá bạn đã đăng, với trạng thái kiểm duyệt thật: Chờ duyệt · Đã duyệt · Không
          được duyệt. Muốn đăng thêm? Qua mục <Link href="/dang-bao-ca">Đăng báo cá</Link>.
        </p>
      </div>
      <div style={{ maxWidth: 820 }}>
        <MyReportsClient />
      </div>
    </div>
  );
}
