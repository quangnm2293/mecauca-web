import type { Metadata } from 'next';
import Link from 'next/link';
import { MyContributionsClient } from '@/components/MyContent';

export const metadata: Metadata = {
  title: 'Đóng góp của tôi — Mê Câu Cá',
  robots: { index: false },
};

export default function MyContributionsPage() {
  return (
    <div className="wrap">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/">Trang chủ</Link> / <Link href="/tai-khoan">Tài khoản</Link> / Đóng góp của
        tôi
      </nav>
      <div className="spot-head">
        <h1>Đóng góp của tôi</h1>
        <p style={{ color: 'var(--ink-soft)', maxWidth: 720 }}>
          Bãi câu mới và gợi ý sửa bạn đã gửi cho cộng đồng, kèm trạng thái kiểm duyệt. Thêm bãi
          nữa ở mục <Link href="/dong-gop">Đóng góp bãi câu</Link>.
        </p>
      </div>
      <div style={{ maxWidth: 820 }}>
        <MyContributionsClient />
      </div>
    </div>
  );
}
