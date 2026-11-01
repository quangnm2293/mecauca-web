import type { Metadata } from 'next';
import Link from 'next/link';
import ModerationClient from '@/components/ModerationClient';

export const metadata: Metadata = {
  title: 'Kiểm duyệt nội dung — Mê Câu Cá',
  robots: { index: false },
};

export default function ModerationPage() {
  return (
    <div className="wrap">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/">Trang chủ</Link> / <Link href="/tai-khoan">Tài khoản</Link> / Kiểm duyệt
        nội dung
      </nav>
      <div className="spot-head">
        <h1>Kiểm duyệt nội dung</h1>
        <p style={{ color: 'var(--ink-soft)', maxWidth: 720 }}>
          Hàng chờ của cộng đồng: bãi câu mới, báo cá, gợi ý sửa và báo cáo vi phạm. Duyệt xong là
          nội dung công khai ngay.
        </p>
      </div>
      <div style={{ maxWidth: 860 }}>
        <ModerationClient />
      </div>
    </div>
  );
}
