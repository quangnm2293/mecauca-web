import type { Metadata } from 'next';
import Link from 'next/link';
import JournalClient from '@/components/JournalClient';

export const metadata: Metadata = {
  title: 'Nhật ký câu — sổ tay chuyến đi của riêng bạn',
  description:
    'Nhật ký câu cá cá nhân: ghi lại từng chuyến đi, loài cá, cân nặng và tỉ lệ móm — chỉ lưu trên thiết bị của bạn.',
  robots: { index: false },
};

export default function JournalPage() {
  return (
    <div className="wrap">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/">Trang chủ</Link> / Nhật ký câu
      </nav>
      <div className="spot-head">
        <h1>Nhật ký câu</h1>
        <p style={{ color: 'var(--ink-soft)', maxWidth: 720 }}>
          Sổ tay chuyến đi của riêng bạn — câu được hay móm cũng ghi lại, lâu dần thành dữ liệu
          chuẩn nhất cho chính bạn.
        </p>
      </div>
      <div style={{ maxWidth: 820 }}>
        <JournalClient />
      </div>
    </div>
  );
}
