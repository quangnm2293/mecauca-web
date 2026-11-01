import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import DirectoryClient from '@/components/DirectoryClient';
import { spots } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Bãi câu nước ngọt khắp Việt Nam — sông, hồ chứa, hồ dịch vụ',
  description: `Danh bạ ${spots.length} bãi câu nước ngọt đã kiểm chứng trên cả nước: loài cá thường có, giá vé tham khảo, tiện ích và dự báo điểm câu cá hôm nay tại từng bãi.`,
};

export default function DirectoryPage() {
  return (
    <div className="wrap">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/">Trang chủ</Link> / Bãi câu
      </nav>
      <div className="spot-head">
        <h1>Bãi câu nước ngọt</h1>
        <p style={{ color: 'var(--ink-soft)', maxWidth: 720 }}>
          {spots.length} bãi câu thật đã được kiểm chứng toạ độ trên cả nước — sông, hồ chứa, hồ tự
          nhiên và hồ dịch vụ. Bấm vào từng bãi để xem loài cá, giá vé và dự báo điểm câu cá hôm
          nay tại đúng bãi đó.
        </p>
      </div>
      <Suspense fallback={<p className="loading-note">Đang tải danh bạ…</p>}>
        <DirectoryClient />
      </Suspense>
    </div>
  );
}
