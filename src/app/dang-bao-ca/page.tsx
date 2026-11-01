import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import ReportFormShell from './ReportFormShell';

export const metadata: Metadata = {
  title: 'Đăng báo cá — chia sẻ chiến lợi phẩm với cộng đồng',
  description:
    'Đăng báo cá sau mỗi chuyến đi: chọn bãi, ghi loài cá, cân nặng, mồi đã dùng. Báo cá qua kiểm duyệt rồi công khai cho cộng đồng Mê Câu Cá.',
};

export default function PostReportPage() {
  return (
    <div className="wrap">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/">Trang chủ</Link> / Đăng báo cá
      </nav>
      <div className="spot-head">
        <h1>Đăng báo cá</h1>
        <p style={{ color: 'var(--ink-soft)', maxWidth: 720 }}>
          Vừa câu được cá? Chia sẻ cho anh em cùng biết bãi nào đang có cá ăn. Báo cá sẽ qua hàng
          chờ kiểm duyệt trước khi công khai.
        </p>
      </div>
      <div style={{ maxWidth: 720 }}>
        <Suspense fallback={<p className="loading-note">Đang tải biểu mẫu…</p>}>
          <ReportFormShell />
        </Suspense>
      </div>
    </div>
  );
}
