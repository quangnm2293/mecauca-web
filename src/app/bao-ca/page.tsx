import type { Metadata } from 'next';
import Link from 'next/link';
import { LatestReports } from '@/components/ReportList';
import { APP_URL } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Báo cá cộng đồng — ai câu được gì, ở đâu',
  description:
    'Báo cá mới nhất từ cộng đồng Mê Câu Cá: loài cá, cân nặng, mồi đã dùng và bãi câu — tất cả đều đã qua kiểm duyệt trước khi công khai.',
};

export default function ReportsPage() {
  return (
    <div className="wrap">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/">Trang chủ</Link> / Báo cá
      </nav>
      <div className="spot-head">
        <h1>Báo cá cộng đồng</h1>
        <p style={{ color: 'var(--ink-soft)', maxWidth: 720 }}>
          Ai câu được gì, ở bãi nào, dùng mồi gì — báo cá do cần thủ chia sẻ trong ứng dụng và đã
          qua kiểm duyệt. Muốn đăng báo cá của bạn? Mở ứng dụng, chọn bãi và đăng — duyệt xong là
          hiện ở đây cho cả cộng đồng.
        </p>
      </div>
      <LatestReports limit={30} />
      <section className="cta-band">
        <div>
          <h2>Vừa câu được cá?</h2>
          <p>Đăng báo cá trong ứng dụng để anh em cùng biết bãi nào đang có cá ăn.</p>
        </div>
        <a className="btn" href={APP_URL} target="_blank" rel="noreferrer">
          Mở ứng dụng Mê Câu Cá
        </a>
      </section>
    </div>
  );
}
