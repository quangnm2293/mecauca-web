import type { Metadata } from 'next';
import Link from 'next/link';
import ContributeForm from '@/components/ContributeForm';

export const metadata: Metadata = {
  title: 'Đóng góp bãi câu mới — xây bản đồ bãi câu cùng cộng đồng',
  description:
    'Biết bãi câu nước ngọt nào hay mà danh bạ chưa có? Ghim vị trí trên bản đồ và thêm vào — bãi mới qua kiểm duyệt rồi công khai cho cộng đồng Mê Câu Cá.',
};

export default function ContributePage() {
  return (
    <div className="wrap">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/">Trang chủ</Link> / Đóng góp bãi câu
      </nav>
      <div className="spot-head">
        <h1>Xây bản đồ bãi câu cùng cộng đồng</h1>
        <p style={{ color: 'var(--ink-soft)', maxWidth: 720 }}>
          Biết bãi câu nước ngọt nào hay mà danh bạ chưa có? Thêm vào bản đồ — bãi mới sẽ ở trạng
          thái "Chờ duyệt" đến khi được kiểm duyệt, để dữ liệu chung luôn đáng tin.
        </p>
      </div>
      <div style={{ maxWidth: 720 }}>
        <ContributeForm />
      </div>
    </div>
  );
}
